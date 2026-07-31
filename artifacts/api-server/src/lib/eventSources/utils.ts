import type { EventItem } from "@workspace/db";

export interface CityGeo {
  lat: number;
  lon: number;
  timezone: string;
  slug: string;
}

const CITY_GEO: Record<string, CityGeo> = {
  "Austin": { lat: 30.2672, lon: -97.7431, timezone: "America/Chicago", slug: "austin-tx" },
  "Austin, TX": { lat: 30.2672, lon: -97.7431, timezone: "America/Chicago", slug: "austin-tx" },
  "Austin, Texas": { lat: 30.2672, lon: -97.7431, timezone: "America/Chicago", slug: "austin-tx" },
  "New York": { lat: 40.7128, lon: -74.0060, timezone: "America/New_York", slug: "new-york-ny" },
  "New York, NY": { lat: 40.7128, lon: -74.0060, timezone: "America/New_York", slug: "new-york-ny" },
  "San Francisco": { lat: 37.7749, lon: -122.4194, timezone: "America/Los_Angeles", slug: "san-francisco-ca" },
  "San Francisco, CA": { lat: 37.7749, lon: -122.4194, timezone: "America/Los_Angeles", slug: "san-francisco-ca" },
  "Los Angeles": { lat: 34.0522, lon: -118.2437, timezone: "America/Los_Angeles", slug: "los-angeles-ca" },
  "Los Angeles, CA": { lat: 34.0522, lon: -118.2437, timezone: "America/Los_Angeles", slug: "los-angeles-ca" },
  "Chicago": { lat: 41.8781, lon: -87.6298, timezone: "America/Chicago", slug: "chicago-il" },
  "Chicago, IL": { lat: 41.8781, lon: -87.6298, timezone: "America/Chicago", slug: "chicago-il" },
  "Seattle": { lat: 47.6062, lon: -122.3321, timezone: "America/Los_Angeles", slug: "seattle-wa" },
  "Seattle, WA": { lat: 47.6062, lon: -122.3321, timezone: "America/Los_Angeles", slug: "seattle-wa" },
  "Denver": { lat: 39.7392, lon: -104.9903, timezone: "America/Denver", slug: "denver-co" },
  "Denver, CO": { lat: 39.7392, lon: -104.9903, timezone: "America/Denver", slug: "denver-co" },
  "Miami": { lat: 25.7617, lon: -80.1918, timezone: "America/New_York", slug: "miami-fl" },
  "Miami, FL": { lat: 25.7617, lon: -80.1918, timezone: "America/New_York", slug: "miami-fl" },
  "Boston": { lat: 42.3601, lon: -71.0589, timezone: "America/New_York", slug: "boston-ma" },
  "Boston, MA": { lat: 42.3601, lon: -71.0589, timezone: "America/New_York", slug: "boston-ma" },
  // Extended city list
  "St. Louis": { lat: 38.6270, lon: -90.1994, timezone: "America/Chicago", slug: "st-louis-mo" },
  "St. Louis, MO": { lat: 38.6270, lon: -90.1994, timezone: "America/Chicago", slug: "st-louis-mo" },
  "Saint Louis": { lat: 38.6270, lon: -90.1994, timezone: "America/Chicago", slug: "st-louis-mo" },
  "Saint Louis, MO": { lat: 38.6270, lon: -90.1994, timezone: "America/Chicago", slug: "st-louis-mo" },
  "Portland": { lat: 45.5051, lon: -122.6750, timezone: "America/Los_Angeles", slug: "portland-or" },
  "Portland, OR": { lat: 45.5051, lon: -122.6750, timezone: "America/Los_Angeles", slug: "portland-or" },
  "Sacramento": { lat: 38.5816, lon: -121.4944, timezone: "America/Los_Angeles", slug: "sacramento-ca" },
  "Sacramento, CA": { lat: 38.5816, lon: -121.4944, timezone: "America/Los_Angeles", slug: "sacramento-ca" },
  "Nashville": { lat: 36.1627, lon: -86.7816, timezone: "America/Chicago", slug: "nashville-tn" },
  "Nashville, TN": { lat: 36.1627, lon: -86.7816, timezone: "America/Chicago", slug: "nashville-tn" },
  "Atlanta": { lat: 33.7490, lon: -84.3880, timezone: "America/New_York", slug: "atlanta-ga" },
  "Atlanta, GA": { lat: 33.7490, lon: -84.3880, timezone: "America/New_York", slug: "atlanta-ga" },
  "Dallas": { lat: 32.7767, lon: -96.7970, timezone: "America/Chicago", slug: "dallas-tx" },
  "Dallas, TX": { lat: 32.7767, lon: -96.7970, timezone: "America/Chicago", slug: "dallas-tx" },
  "Houston": { lat: 29.7604, lon: -95.3698, timezone: "America/Chicago", slug: "houston-tx" },
  "Houston, TX": { lat: 29.7604, lon: -95.3698, timezone: "America/Chicago", slug: "houston-tx" },
  "Phoenix": { lat: 33.4484, lon: -112.0740, timezone: "America/Phoenix", slug: "phoenix-az" },
  "Phoenix, AZ": { lat: 33.4484, lon: -112.0740, timezone: "America/Phoenix", slug: "phoenix-az" },
  "Minneapolis": { lat: 44.9778, lon: -93.2650, timezone: "America/Chicago", slug: "minneapolis-mn" },
  "Minneapolis, MN": { lat: 44.9778, lon: -93.2650, timezone: "America/Chicago", slug: "minneapolis-mn" },
  "San Diego": { lat: 32.7157, lon: -117.1611, timezone: "America/Los_Angeles", slug: "san-diego-ca" },
  "San Diego, CA": { lat: 32.7157, lon: -117.1611, timezone: "America/Los_Angeles", slug: "san-diego-ca" },
  // Active tenant cities
  "Brushy Creek": { lat: 30.5085, lon: -97.7528, timezone: "America/Chicago", slug: "brushy-creek-tx" },
  "Brushy Creek, TX": { lat: 30.5085, lon: -97.7528, timezone: "America/Chicago", slug: "brushy-creek-tx" },
  "Bulverde, TX": { lat: 29.7474, lon: -98.4248, timezone: "America/Chicago", slug: "bulverde-tx" },
  "Bulverde": { lat: 29.7474, lon: -98.4248, timezone: "America/Chicago", slug: "bulverde-tx" },
  // Non-geographic city strings — map to nearest real city
  "Austin Cares": { lat: 30.2672, lon: -97.7431, timezone: "America/Chicago", slug: "austin-tx" },
};

/** Derive a reasonable US timezone from longitude when we can't look it up. */
function timezoneFromLon(lon: number): string {
  if (lon > -87.5) return "America/New_York";   // Eastern
  if (lon > -102.5) return "America/Chicago";   // Central
  if (lon > -115) return "America/Denver";      // Mountain
  return "America/Los_Angeles";                 // Pacific
}

/** In-process cache for Nominatim geocode results (unknown cities). Resets on server restart. */
const _geoCache = new Map<string, CityGeo | null>();

export function getCityGeo(city: string): CityGeo | null {
  const normalized = city.trim();
  return CITY_GEO[normalized] || CITY_GEO[normalized.split(",")[0].trim()] || null;
}

/**
 * Resolves geo coordinates for any city string.
 * 1. Checks the static CITY_GEO map (instant, no network).
 * 2. Checks the in-process cache from previous Nominatim lookups.
 * 3. Falls back to a Nominatim geocode call so new cities work without code changes.
 */
export async function resolveCityGeo(city: string): Promise<CityGeo | null> {
  const static_ = getCityGeo(city);
  if (static_) return static_;

  const cacheKey = city.trim().toLowerCase();
  if (_geoCache.has(cacheKey)) return _geoCache.get(cacheKey)!;

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "eventcarpooling/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) { _geoCache.set(cacheKey, null); return null; }
    const results = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!results[0]) { _geoCache.set(cacheKey, null); return null; }
    const lat = parseFloat(results[0].lat);
    const lon = parseFloat(results[0].lon);
    const geo: CityGeo = {
      lat,
      lon,
      timezone: timezoneFromLon(lon),
      slug: city.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    };
    _geoCache.set(cacheKey, geo);
    return geo;
  } catch {
    _geoCache.set(cacheKey, null);
    return null;
  }
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Tech: ["tech", "software", "startup", "AI", "developer", "coding", "hackathon", "entrepreneur", "venture", "SaaS", "fintech"],
  Music: ["music", "concert", "live music", "band", "jazz", "blues", "rock", "festival", "DJ", "open mic", "hip hop", "indie"],
  Food: ["food", "dining", "restaurant", "taco", "BBQ", "farmers market", "cooking", "dinner", "brunch", "culinary", "craft beer", "wine"],
  Wellness: ["yoga", "fitness", "run", "hike", "bike", "outdoor", "wellness", "meditation", "pilates", "gym", "health", "trail"],
  Civics: ["community", "civic", "volunteer", "nonprofit", "neighborhood", "policy", "local government", "advocacy", "social impact"],
};

export function getCategoryKeywords(category: string): string[] {
  return CATEGORY_KEYWORDS[category] || [category.toLowerCase()];
}

export function getCategorySearchQuery(category: string): string {
  const keywords = getCategoryKeywords(category);
  return keywords.slice(0, 3).join(" ");
}

export function formatISODate(isoStr: string, timezone = "America/Chicago"): string {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const datePart = d.toLocaleDateString("en-US", {
      weekday: "long", month: "short", day: "numeric",
      timeZone: timezone,
    });
    const timePart = d.toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit", hour12: true,
      timeZone: timezone,
    });
    return `${datePart} at ${timePart}`;
  } catch {
    return isoStr;
  }
}

function extractDateKey(dateStr: string): string {
  if (!dateStr) return "";
  const iso = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[2]}-${iso[3]}`;
  const m = dateStr.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})/i);
  if (m) return `${m[1].substring(0, 3).toLowerCase()}-${m[2]}`;
  return dateStr.substring(0, 10).toLowerCase().replace(/\s+/g, "-");
}

export function deduplicateEvents(events: EventItem[]): EventItem[] {
  const seen = new Set<string>();
  return events.filter(e => {
    const titleKey = e.title.toLowerCase().replace(/\s+/g, " ").substring(0, 40);
    const dateKey = extractDateKey(e.date || "");
    const key = `${titleKey}|${dateKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Maps DB category names (canonical + aliases) to their guessCategory() equivalents
// guessCategory() now returns exactly one of: "Tech", "Arts", "Sports", "Civics", "Wellness"
const TENANT_TO_GUESS_CATEGORIES: Record<string, string[]> = {
  "Tech": ["Tech"],
  "Tech & Business": ["Tech"],
  "Music": ["Arts"],
  "Food": ["Arts"],
  "Food & Drink": ["Arts"],
  "Wellness": ["Wellness"],
  "Wellness & Fitness": ["Wellness", "Sports"],
  "Civics": ["Civics"],
  "Community": ["Civics"],
  "Arts & Culture": ["Arts"],
  "Learning": ["Arts"],
};

// Collapses aliased category names to a single canonical form used by adapters
const CATEGORY_ALIASES: Record<string, string> = {
  "Food & Drink": "Food",
  "Wellness & Fitness": "Wellness",
  "Community": "Civics",
  "Tech & Business": "Tech",
  "Outdoors & Fitness": "Wellness",
};

export function canonicalizeCategory(cat: string): string {
  return CATEGORY_ALIASES[cat] || cat;
}

export function filterByTenantCategories(events: EventItem[], tenantCategories: string[]): EventItem[] {
  if (tenantCategories.length === 0) return events;

  const acceptedGuessCats = new Set<string>();
  for (const cat of tenantCategories) {
    const mapped = TENANT_TO_GUESS_CATEGORIES[cat] || [cat];
    mapped.forEach(gc => acceptedGuessCats.add(gc));
  }

  return events.filter(event => {
    // Check stored category (set by structured adapters)
    if (event.category && event.category !== "Events" && acceptedGuessCats.has(event.category)) return true;
    // Re-guess from title + description (handles generic or mis-categorised events)
    const guessed = guessCategory(`${event.title} ${event.description || ""}`);
    return acceptedGuessCats.has(guessed);
  });
}

export function isWithinDateRange(isoStr: string, weekOf: Date, weekEnd?: Date): boolean {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return true;
    const end = weekEnd || new Date(weekOf.getTime() + 7 * 24 * 60 * 60 * 1000);
    return d >= weekOf && d < end;
  } catch {
    return true;
  }
}

/**
 * Decode common HTML entities from a URL string so that image/link URLs stored
 * in the DB never contain raw `&amp;`, `&lt;`, etc.  The most common culprit is
 * `&amp;` introduced when an imageUrl is extracted from raw HTML attributes.
 */
export function decodeHtmlEntities(str: string | null | undefined): string | null {
  if (!str) return str ?? null;
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

// Returns exactly one of the 5 display categories: Tech, Arts, Sports, Civics, Wellness
export function guessCategory(text: string): string {
  const lower = text.toLowerCase();
  if (/tech|startup|ai\b|code|developer|hackathon|entrepreneur|venture|founder|saas|software|product hunt/.test(lower)) return "Tech";
  if (/yoga|meditation|mindfulness|pilates|wellness|health retreat/.test(lower)) return "Wellness";
  if (/run|hike|bike|fitness|gym|outdoor|trail|swim|sport|cycling|crossfit/.test(lower)) return "Sports";
  if (/community|volunteer|nonprofit|charity|civic|neighborhood|advocacy|social impact/.test(lower)) return "Civics";
  return "Arts";
}
