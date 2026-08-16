/**
 * Shared city geography config.
 *
 * MAP_CENTERS — used by emailService.ts (map section) AND geocodeVenue.ts
 *   (bounding-box validation).  Any new city must be added here.
 *
 * CITY_MAX_RADIUS_MILES — maximum distance from the city center that a geocoded
 *   coordinate may be.  If a Nominatim result exceeds this it is rejected (nulled
 *   out) so it cannot drag the map to another state/country.
 *
 * CITY_LABELS — human-readable label used in email copy.
 */

export interface CityCenter {
  lat: number;
  lng: number;
}

export const MAP_CENTERS: Record<string, CityCenter> = {
  austin:      { lat: 30.267, lng: -97.743 },
  austincares: { lat: 30.267, lng: -97.743 },
  brushycreek: { lat: 30.508, lng: -97.679 },
  bulverde:    { lat: 29.747, lng: -98.446 },
  portland:    { lat: 45.523, lng: -122.676 },
  sacramento:  { lat: 38.575, lng: -121.479 },
  stlouis:     { lat: 38.627, lng: -90.197 },
  tokyo:       { lat: 35.676, lng: 139.650 },
  dc:          { lat: 38.907, lng: -77.037 },
};

export const CITY_LABELS: Record<string, string> = {
  austin:      "Austin",
  austincares: "Austin",
  brushycreek: "Round Rock / Brushy Creek",
  bulverde:    "Bulverde",
  portland:    "Portland",
  sacramento:  "Sacramento",
  stlouis:     "St. Louis",
  tokyo:       "Tokyo",
  dc:          "Washington, DC",
};

/**
 * Per-city radius (miles).  Any geocoded coordinate farther than this from the
 * city center is considered a bad geocode and is nulled out.
 *
 * Values are intentionally generous to cover metro suburbs while still catching
 * cross-country mismatches (e.g. "Portland" resolving to Portland, TX).
 */
export const CITY_MAX_RADIUS_MILES: Record<string, number> = {
  austin:      60,
  austincares: 60,
  brushycreek: 40,
  bulverde:    40,
  portland:    60,
  sacramento:  60,
  stlouis:     60,
  tokyo:       60,
  dc:          60,
};

/** Haversine distance in miles between two lat/lng pairs. */
export function haversineMiles(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Returns true if the coordinates are within the city's allowed radius.
 * Always returns true when the city slug is unknown (no config → no rejection).
 */
export function isWithinCityBounds(
  slug: string,
  lat: number,
  lng: number,
): boolean {
  const center = MAP_CENTERS[slug];
  if (!center) return true; // unknown city — don't reject
  const maxMiles = CITY_MAX_RADIUS_MILES[slug] ?? 60;
  return haversineMiles(center.lat, center.lng, lat, lng) <= maxMiles;
}
