import { db, digestsTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import { logger } from "./logger";

const NOMINATIM_UA = "EventCarpooling/1.0 (contact@eventcarpooling.com)";

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
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

// ---------------------------------------------------------------------------
// Nominatim fetch
// ---------------------------------------------------------------------------

async function nominatim(query: string): Promise<{ lat: number; lng: number } | null> {
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Geocode a single venue string. Checks the cache first; calls Nominatim on a
 * miss and stores the result (including null for unresolvable venues).
 */
export async function geocodeVenue(venueText: string): Promise<{ lat: number | null; lng: number | null }> {
  const clean = venueText.trim();
  if (!clean) return { lat: null, lng: null };

  const cached = await cacheGet(clean);
  if (cached.found) return { lat: cached.lat, lng: cached.lng };

  const coords = await nominatim(clean);
  await cacheSet(clean, coords?.lat ?? null, coords?.lng ?? null);
  return { lat: coords?.lat ?? null, lng: coords?.lng ?? null };
}

/**
 * Geocode an array of raw event objects, attaching `lat` and `lng` to each.
 *
 * - Cache hits are resolved without any HTTP call (no delay).
 * - Nominatim calls are rate-limited to one per 1.1 s to respect the usage policy.
 * - Events with no venue or already-set coordinates are passed through unchanged.
 * - Any per-event error leaves the event unmodified (never drops an event).
 */
export async function geocodeEvents(
  events: Array<Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> {
  let needsDelay = false;
  const result: Array<Record<string, unknown>> = [];

  for (const event of events) {
    const venue = typeof event["venue"] === "string" ? event["venue"].trim() : "";

    // Skip: no venue, or coordinates already present
    if (!venue || event["lat"] !== undefined) {
      result.push(event);
      continue;
    }

    try {
      const cached = await cacheGet(venue);
      if (cached.found) {
        result.push({ ...event, lat: cached.lat, lng: cached.lng });
        continue;
      }

      // Rate-limit only for real Nominatim requests
      if (needsDelay) await sleep(1100);
      needsDelay = true;

      const coords = await nominatim(venue);
      await cacheSet(venue, coords?.lat ?? null, coords?.lng ?? null);
      result.push({ ...event, lat: coords?.lat ?? null, lng: coords?.lng ?? null });
      logger.debug({ venue, found: !!coords }, "Geocoded venue via Nominatim");
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
 */
export async function geocodeAndPatchDigest(digestId: number, events: Array<Record<string, unknown>>): Promise<void> {
  try {
    const geocoded = await geocodeEvents(events);
    await db
      .update(digestsTable)
      .set({ events: geocoded as any })
      .where(eq(digestsTable.id, digestId));
    logger.info({ digestId, total: events.length }, "Geocode patch complete");
  } catch (err) {
    logger.warn({ digestId, err }, "geocodeAndPatchDigest failed");
  }
}
