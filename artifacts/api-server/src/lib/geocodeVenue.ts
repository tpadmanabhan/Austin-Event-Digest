import { db, digestsTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import { logger } from "./logger";
import { isWithinCityBounds } from "./cityBounds";

const NOMINATIM_UA = "EventCarpooling/1.0 (contact@eventcarpooling.com)";

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// CJK / Japanese detection
// ---------------------------------------------------------------------------

/**
 * Returns true if the string contains CJK Unified Ideographs, Hiragana,
 * Katakana, or CJK Compatibility Ideographs — i.e. is likely a Japanese
 * or Chinese venue name that Nominatim cannot resolve on its own.
 */
export function containsCJK(text: string): boolean {
  return /[\u3000-\u9fff\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff]/.test(text);
}

// ---------------------------------------------------------------------------
// Geographic validation for Tokyo venue results
// ---------------------------------------------------------------------------

/**
 * Bounding box for the Tokyo metropolitan area (covers Tokyo, Yokohama,
 * Saitama, Chiba, and the broader Kanto region).
 *
 * lat 35.0–36.5 N, lng 138.5–140.5 E
 *
 * This deliberately excludes neighbouring countries whose geocoders might
 * return a false match for a generic Japanese venue name:
 *   - Seoul, South Korea (37.5 N, 127 E) — lng 127 < 138.5  ✗
 *   - Taipei, Taiwan    (25.0 N, 121 E)  — both out of range ✗
 *   - Beijing, China    (39.9 N, 116 E)  — lng 116 < 138.5  ✗
 *
 * If Tokyo events are ever supplemented with venues in other Japanese cities
 * (Osaka, Kyoto, etc.) this function will need to be widened or replaced with
 * a proper Japan national bounding box.
 */
export function isInTokyoRegion(lat: number, lng: number): boolean {
  return lat >= 35.0 && lat <= 36.5 && lng >= 138.5 && lng <= 140.5;
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

async function cacheGet(venue: string): Promise<{ found: boolean; lat: number | null; lng: number | null }> {
  try {
    const res = await db.execute(sql`
      SELECT lat, lng FROM venue_geocode_cache WHERE venue_text = ${venue}
    `);
    if (res.rows.length > 0) {
      const row = res.rows[0] as { lat: number | null; lng: number | null };
      return { found: true, lat: row.lat ?? null, lng: row.lng ?? null };
    }
  } catch {
    // Table may not exist yet during first boot — treat as cache miss
  }
  return { found: false, lat: null, lng: null };
}

async function cacheSet(venue: string, lat: number | null, lng: number | null): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO venue_geocode_cache (venue_text, lat, lng, geocoded_at)
      VALUES (${venue}, ${lat}, ${lng}, NOW())
      ON CONFLICT (venue_text) DO UPDATE
        SET lat = EXCLUDED.lat,
            lng = EXCLUDED.lng,
            geocoded_at = NOW()
    `);
  } catch (err) {
    logger.warn({ err, venue }, "Failed to write venue geocode cache");
  }
}

async function cacheDelete(venue: string): Promise<void> {
  try {
    await db.execute(sql`
      DELETE FROM venue_geocode_cache WHERE venue_text = ${venue}
    `);
  } catch (err) {
    logger.warn({ err, venue }, "Failed to delete venue geocode cache entry");
  }
}

/**
 * Checks a cached result for a CJK venue. Returns true when the cached value
 * is valid and should be used as-is. Returns false when the entry is stale
 * (null — previously failed before Photon was added, or foreign — a bad
 * Nominatim result from before geographic validation existed) and should be
 * deleted and re-geocoded.
 */
function isCJKCacheValid(lat: number | null, lng: number | null): boolean {
  if (lat === null || lng === null) return false;         // previously unresolvable — retry with Photon
  if (!isInTokyoRegion(lat, lng)) return false;          // foreign match — stale bad result
  return true;
}

// ---------------------------------------------------------------------------
// Nominatim fetch
// ---------------------------------------------------------------------------

async function nominatimQuery(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": NOMINATIM_UA },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json() as Array<{ lat: string; lon: string }>;
    if (!Array.isArray(data) || data.length === 0) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

/**
 * Geocode a query string, trying the exact query first, then simplified fallbacks:
 *  - Strip ", SubPremise" suffix (e.g. "Venue, Minato City" → "Venue")
 *  - Strip trailing comma-parts one at a time
 * This handles cases like "Tokyo Opera City Concert Hall, Shinjuku" where Nominatim
 * only resolves "Tokyo Opera City".
 */
async function nominatim(query: string): Promise<{ lat: number; lng: number } | null> {
  const exact = await nominatimQuery(query);
  if (exact) return exact;

  // Build fallback candidates by progressively stripping the rightmost comma-part
  const parts = query.split(",").map(p => p.trim()).filter(Boolean);
  for (let i = parts.length - 1; i >= 1; i--) {
    await sleep(1100); // respect Nominatim rate-limit between fallback attempts
    const candidate = parts.slice(0, i).join(", ");
    const result = await nominatimQuery(candidate);
    if (result) return result;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Photon (Komoot) geocoder — free, no API key, better Japanese coverage
// ---------------------------------------------------------------------------

/**
 * Queries the Photon geocoder (https://photon.komoot.io), which is based on
 * OpenStreetMap data but has better international/Japanese venue coverage than
 * Nominatim. Used as a fallback when Nominatim fails for CJK venue names.
 */
async function photonQuery(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1&lang=ja`;
    const res = await fetch(url, {
      headers: { "User-Agent": NOMINATIM_UA },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json() as {
      features?: Array<{ geometry?: { coordinates?: [number, number] } }>;
    };
    const coords = data.features?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    const lng = coords[0];
    const lat = coords[1];
    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

/**
 * Geocode a Japanese/CJK venue name.
 *
 * Strategy (each result is validated against the Tokyo regional bounding box
 * before being accepted, so same-named venues in Seoul, Taipei, etc. cannot
 * silently win):
 *  1. Nominatim — exact query
 *  2. Nominatim with ", Tokyo, Japan" appended (helps bare venue names)
 *  3. Photon   — exact query          (better Japanese OSM coverage)
 *  4. Photon   with ", Tokyo, Japan" appended
 */
export async function geocodeJapanese(venue: string): Promise<{ lat: number; lng: number } | null> {
  const hasTokyo = /tokyo|japan/i.test(venue);

  // 1. Nominatim — exact query, validate against Tokyo bbox
  const nom1 = await nominatimQuery(venue);
  if (nom1 && isInTokyoRegion(nom1.lat, nom1.lng)) return nom1;

  await sleep(1100);

  // 2. Nominatim with Tokyo, Japan suffix
  if (!hasTokyo) {
    const nom2 = await nominatimQuery(`${venue}, Tokyo, Japan`);
    if (nom2 && isInTokyoRegion(nom2.lat, nom2.lng)) return nom2;
    await sleep(1100);
  }

  // 3. Photon — exact query, validate against Tokyo bbox
  const photon1 = await photonQuery(venue);
  if (photon1 && isInTokyoRegion(photon1.lat, photon1.lng)) return photon1;

  await sleep(1100);

  // 4. Photon with Tokyo, Japan suffix
  if (!hasTokyo) {
    const photon2 = await photonQuery(`${venue}, Tokyo, Japan`);
    if (photon2 && isInTokyoRegion(photon2.lat, photon2.lng)) return photon2;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Geocode a single venue string. Checks the cache first; calls Nominatim on a
 * miss and stores the result (including null for unresolvable venues).
 *
 * For CJK (Japanese) venues, uses an enhanced multi-provider strategy and
 * validates every result against the Tokyo regional bbox. Stale cache entries
 * (null — pre-Photon failures, or foreign coords — bad Nominatim matches) are
 * deleted and retried transparently.
 *
 * When `citySlug` is provided the returned coordinates are additionally
 * validated against that city's bounding radius.  If the geocoder returns a
 * location outside the radius (e.g. "Portland" resolving to Portland, TX
 * instead of Portland, OR) the coordinates are rejected and null is returned
 * so the bad pin is never stored.
 */
export async function geocodeVenue(
  venueText: string,
  citySlug?: string,
): Promise<{ lat: number | null; lng: number | null }> {
  const clean = venueText.trim();
  if (!clean) return { lat: null, lng: null };

  const cached = await cacheGet(clean);
  if (cached.found) {
    if (containsCJK(clean)) {
      if (isCJKCacheValid(cached.lat, cached.lng)) {
        // CJK cache valid — still check city bounds before returning
        if (cached.lat != null && cached.lng != null && citySlug && !isWithinCityBounds(citySlug, cached.lat, cached.lng)) {
          logger.warn({ venue: clean, citySlug, lat: cached.lat, lng: cached.lng }, "Cached CJK geocode rejected — outside city bounds");
          await cacheDelete(clean);
        } else {
          return { lat: cached.lat, lng: cached.lng };
        }
      } else {
        // Stale or foreign — delete entry and fall through to fresh geocode
        await cacheDelete(clean);
      }
    } else {
      if (cached.lat != null && cached.lng != null && citySlug && !isWithinCityBounds(citySlug, cached.lat, cached.lng)) {
        logger.warn({ venue: clean, citySlug, lat: cached.lat, lng: cached.lng }, "Cached geocode rejected — outside city bounds");
        return { lat: null, lng: null };
      }
      return { lat: cached.lat, lng: cached.lng };
    }
  }

  let coords: { lat: number; lng: number } | null;
  if (containsCJK(clean)) {
    coords = await geocodeJapanese(clean);
  } else {
    coords = await nominatim(clean);
  }

  if (coords && citySlug && !isWithinCityBounds(citySlug, coords.lat, coords.lng)) {
    logger.warn({ venue: clean, citySlug, lat: coords.lat, lng: coords.lng }, "Geocode rejected — outside city bounds; storing null");
    await cacheSet(clean, null, null);
    return { lat: null, lng: null };
  }
  await cacheSet(clean, coords?.lat ?? null, coords?.lng ?? null);
  return { lat: coords?.lat ?? null, lng: coords?.lng ?? null };
}

/**
 * Geocode an array of raw event objects, attaching `lat` and `lng` to each.
 *
 * - Cache hits are resolved without any HTTP call (no delay).
 * - Nominatim calls are rate-limited to one per 1.1 s to respect the usage policy.
 * - Events with no venue or already-set coordinates are passed through unchanged.
 * - For CJK venues, stale/foreign cache entries are invalidated and retried.
 * - Any per-event error leaves the event unmodified (never drops an event).
 * - When `citySlug` is provided, coordinates outside the city's bounding radius
 *   are nulled out so bad geocodes never reach the map.
 */
export async function geocodeEvents(
  events: Array<Record<string, unknown>>,
  citySlug?: string,
): Promise<Array<Record<string, unknown>>> {
  let needsDelay = false;
  const result: Array<Record<string, unknown>> = [];

  for (const event of events) {
    const venue = typeof event["venue"] === "string" ? event["venue"].trim() : "";

    // Skip events with no venue; but for events that already have coordinates,
    // still validate them against city bounds when a slug is provided — this
    // catches source-provided or previously stored out-of-bounds pins.
    if (!venue) {
      result.push(event);
      continue;
    }
    if (event["lat"] !== undefined && event["lat"] !== null) {
      if (citySlug) {
        const eLat = event["lat"] as number;
        const eLng = event["lng"] as number;
        if (eLng != null && !isWithinCityBounds(citySlug, eLat, eLng)) {
          logger.warn({ venue, citySlug, lat: eLat, lng: eLng }, "Existing event coords rejected — outside city bounds");
          result.push({ ...event, lat: null, lng: null });
          continue;
        }
      }
      result.push(event);
      continue;
    }

    try {
      const cached = await cacheGet(venue);
      if (cached.found) {
        if (containsCJK(venue)) {
          if (isCJKCacheValid(cached.lat, cached.lng)) {
            // Valid cached CJK coords — check city bounds before using
            let lat = cached.lat;
            let lng = cached.lng;
            if (lat != null && lng != null && citySlug && !isWithinCityBounds(citySlug, lat, lng)) {
              logger.warn({ venue, citySlug, lat, lng }, "Cached CJK geocode rejected — outside city bounds");
              await cacheDelete(venue);
              lat = null;
              lng = null;
              result.push({ ...event, lat, lng });
            } else {
              result.push({ ...event, lat, lng });
            }
            continue;
          }
          // Stale null or foreign coords — invalidate and re-geocode below
          await cacheDelete(venue);
        } else {
          let lat = cached.lat;
          let lng = cached.lng;
          if (lat != null && lng != null && citySlug && !isWithinCityBounds(citySlug, lat, lng)) {
            logger.warn({ venue, citySlug, lat, lng }, "Cached geocode rejected — outside city bounds");
            lat = null;
            lng = null;
          }
          result.push({ ...event, lat, lng });
          continue;
        }
      }

      // Rate-limit only for real geocoding requests
      if (needsDelay) await sleep(1100);
      needsDelay = true;

      let coords: { lat: number; lng: number } | null;
      if (containsCJK(venue)) {
        // geocodeJapanese has its own internal sleeps — reset the outer delay flag
        needsDelay = false;
        coords = await geocodeJapanese(venue);
        needsDelay = true;
      } else {
        coords = await nominatim(venue);
      }

      let lat = coords?.lat ?? null;
      let lng = coords?.lng ?? null;
      if (lat != null && lng != null && citySlug && !isWithinCityBounds(citySlug, lat, lng)) {
        logger.warn({ venue, citySlug, lat, lng }, "Geocode rejected — outside city bounds; storing null");
        lat = null;
        lng = null;
      }
      await cacheSet(venue, lat, lng);
      result.push({ ...event, lat, lng });
      logger.debug({ venue, citySlug, found: !!coords, accepted: lat != null, cjk: containsCJK(venue) }, "Geocoded venue");
    } catch (err) {
      logger.warn({ venue, err }, "Geocoding error — event kept without coordinates");
      result.push(event);
    }
  }

  return result;
}

/**
 * Geocode all events in a stored digest and update the DB row in place.
 * Intended to be called fire-and-forget after a digest is inserted so the
 * generate/import endpoints are not blocked by Nominatim latency.
 *
 * Pass `citySlug` so that out-of-bounds geocodes are rejected before storage.
 */
export async function geocodeAndPatchDigest(
  digestId: number,
  events: Array<Record<string, unknown>>,
  citySlug?: string,
): Promise<void> {
  try {
    const geocoded = await geocodeEvents(events, citySlug);
    await db
      .update(digestsTable)
      .set({ events: geocoded as any })
      .where(eq(digestsTable.id, digestId));
    logger.info({ digestId, total: events.length, citySlug }, "Geocode patch complete");
  } catch (err) {
    logger.warn({ digestId, err }, "geocodeAndPatchDigest failed");
  }
}
