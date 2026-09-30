/**
 * Known-venue lookup layer.
 *
 * Ticketmaster / Luma often return venue strings with no street address
 * (e.g. "Dante's, Portland" or "Golden 1 Center, Sacramento"). Nominatim
 * frequently geocodes such name-only strings to the wrong city, or not at
 * all — which is how 80+ events across 9 cities ended up with bad or missing
 * pins in a single audit.
 *
 * This module resolves the most common venues per city to hand-verified
 * coordinates BEFORE any external geocoder is consulted. Add new venues here
 * whenever a recurring venue fails to geocode.
 *
 * Matching is done on a normalized venue name (lowercase, punctuation
 * stripped, leading "the " removed) taken from the first comma-segment of the
 * stored venue string.
 */

export interface VenueCoords {
  lat: number;
  lng: number;
}

/**
 * Normalizes a venue name for lookup: first comma segment, lowercased,
 * apostrophes/punctuation stripped, leading "the " removed, whitespace
 * collapsed. "Dante's, Portland" → "dantes".
 */
export function normalizeVenueName(venueText: string): string {
  const first = (venueText.split(",")[0] ?? "").trim().toLowerCase();
  return first
    .replace(/^the\s+/, "")
    .replace(/[’'".!?()]/g, "")
    .replace(/\s*[-–—]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tenant slug aliases — cities that share the same venue pool. */
const SLUG_ALIASES: Record<string, string> = {
  austincares: "austin",
};

/**
 * Per-city known venue coordinates. Keys must already be in
 * normalizeVenueName() form.
 */
const KNOWN_VENUES: Record<string, Record<string, VenueCoords>> = {
  portland: {
    "dantes":                        { lat: 45.5231, lng: -122.6731 },
    "crystal ballroom":              { lat: 45.5224, lng: -122.6852 },
    "mcmenamins crystal ballroom":   { lat: 45.5224, lng: -122.6852 },
    "providence park":               { lat: 45.5216, lng: -122.6916 },
    "moda center":                   { lat: 45.5316, lng: -122.6668 },
    "revolution hall":               { lat: 45.5165, lng: -122.6535 },
    "doug fir lounge":               { lat: 45.5223, lng: -122.6565 },
    "mississippi studios":           { lat: 45.5527, lng: -122.6754 },
    "aladdin theater":               { lat: 45.5024, lng: -122.6534 },
    "roseland theater":              { lat: 45.5262, lng: -122.6753 },
    "hawthorne theatre":             { lat: 45.5121, lng: -122.6431 },
    "wonder ballroom":               { lat: 45.5417, lng: -122.6660 },
    "arlene schnitzer concert hall": { lat: 45.5157, lng: -122.6819 },
    "keller auditorium":             { lat: 45.5115, lng: -122.6790 },
    "oregon convention center":      { lat: 45.5285, lng: -122.6625 },
    "veterans memorial coliseum":    { lat: 45.5323, lng: -122.6690 },
    "star theater":                  { lat: 45.5265, lng: -122.6752 },
    "holocene":                      { lat: 45.5127, lng: -122.6608 },
    "polaris hall":                  { lat: 45.5546, lng: -122.6760 },
    "alberta rose theatre":          { lat: 45.5590, lng: -122.6483 },
  },
  sacramento: {
    "golden 1 center":               { lat: 38.5802, lng: -121.4997 },
    "crest theatre":                 { lat: 38.5772, lng: -121.4944 },
    "crest theater":                 { lat: 38.5772, lng: -121.4944 },
    "punch line sacramento":         { lat: 38.6027, lng: -121.4551 },
    "punch line":                    { lat: 38.6027, lng: -121.4551 },
    "ace of spades":                 { lat: 38.5698, lng: -121.4834 },
    "memorial auditorium":           { lat: 38.5766, lng: -121.4864 },
    "safe credit union performing arts center": { lat: 38.5769, lng: -121.4870 },
    "safe credit union convention center":      { lat: 38.5771, lng: -121.4890 },
    "harlows":                       { lat: 38.5702, lng: -121.4655 },
    "cal expo":                      { lat: 38.5966, lng: -121.4310 },
    "heart health park":             { lat: 38.6006, lng: -121.4390 },
    "sutter health park":            { lat: 38.5804, lng: -121.5133 },
    "channel 24":                    { lat: 38.5698, lng: -121.4834 },
    "sacramento community center theater": { lat: 38.5769, lng: -121.4870 },
  },
  stlouis: {
    "pageant":                       { lat: 38.6560, lng: -90.2977 },
    "enterprise center":             { lat: 38.6268, lng: -90.2027 },
    "busch stadium":                 { lat: 38.6226, lng: -90.1928 },
    "fabulous fox theatre":          { lat: 38.6392, lng: -90.2317 },
    "fox theatre":                   { lat: 38.6392, lng: -90.2317 },
    "delmar hall":                   { lat: 38.6563, lng: -90.2990 },
    "blueberry hill":                { lat: 38.6561, lng: -90.3030 },
    "blueberry hill duck room":      { lat: 38.6561, lng: -90.3030 },
    "chaifetz arena":                { lat: 38.6335, lng: -90.2320 },
    "stifel theatre":                { lat: 38.6250, lng: -90.1970 },
    "city museum":                   { lat: 38.6336, lng: -90.2005 },
    "ballpark village":              { lat: 38.6237, lng: -90.1911 },
    "hollywood casino amphitheatre": { lat: 38.7550, lng: -90.1470 },
    "factory":                       { lat: 38.6631, lng: -90.5771 },
    "old rock house":                { lat: 38.6116, lng: -90.2054 },
    "red flag":                      { lat: 38.6360, lng: -90.2334 },
    "off broadway":                  { lat: 38.5946, lng: -90.2189 },
  },
  austin: {
    "moody center":                  { lat: 30.2807, lng: -97.7326 },
    "acl live at the moody theater": { lat: 30.2655, lng: -97.7472 },
    "moody theater":                 { lat: 30.2655, lng: -97.7472 },
    "moody amphitheater":            { lat: 30.2809, lng: -97.7375 },
    "stubbs":                        { lat: 30.2687, lng: -97.7365 },
    "stubbs waller creek amphitheater": { lat: 30.2687, lng: -97.7365 },
    "emos":                          { lat: 30.2266, lng: -97.7526 },
    "emos austin":                   { lat: 30.2266, lng: -97.7526 },
    "mohawk":                        { lat: 30.2696, lng: -97.7367 },
    "antones":                       { lat: 30.2660, lng: -97.7440 },
    "paramount theatre":             { lat: 30.2692, lng: -97.7420 },
    "q2 stadium":                    { lat: 30.3884, lng: -97.7194 },
    "circuit of the americas":       { lat: 30.1328, lng: -97.6411 },
    "germania insurance amphitheater": { lat: 30.1355, lng: -97.6355 },
    "long center":                   { lat: 30.2599, lng: -97.7510 },
    "long center for the performing arts": { lat: 30.2599, lng: -97.7510 },
    "scoot inn":                     { lat: 30.2626, lng: -97.7229 },
    "continental club":              { lat: 30.2483, lng: -97.7494 },
    "broken spoke":                  { lat: 30.2340, lng: -97.7743 },
    "zilker park":                   { lat: 30.2670, lng: -97.7729 },
    "bass concert hall":             { lat: 30.2857, lng: -97.7311 },
    "parish":                        { lat: 30.2670, lng: -97.7419 },
    "empire control room":           { lat: 30.2672, lng: -97.7375 },
    "far out lounge":                { lat: 30.2015, lng: -97.7727 },
    "punch bowl social":             { lat: 30.4021, lng: -97.7241 },
  },
  brushycreek: {
    "dell diamond":                  { lat: 30.5273, lng: -97.6316 },
    "kalahari resort":               { lat: 30.4741, lng: -97.5931 },
    "kalahari resorts & conventions": { lat: 30.4741, lng: -97.5931 },
    "old settlers park":             { lat: 30.5236, lng: -97.6200 },
  },
  bulverde: {
    "tejas rodeo company":           { lat: 29.7594, lng: -98.4193 },
    "frost bank center":             { lat: 29.4270, lng: -98.4375 },
    "alamodome":                     { lat: 29.4169, lng: -98.4789 },
    "majestic theatre":              { lat: 29.4256, lng: -98.4924 },
    "tobin center":                  { lat: 29.4297, lng: -98.4890 },
    "tobin center for the performing arts": { lat: 29.4297, lng: -98.4890 },
  },
  tokyo: {
    "tokyo dome":                    { lat: 35.7056, lng: 139.7519 },
    "nippon budokan":                { lat: 35.6933, lng: 139.7497 },
    "tokyo international forum":     { lat: 35.6767, lng: 139.7638 },
    "ryogoku kokugikan":             { lat: 35.6966, lng: 139.7934 },
    "ariake arena":                  { lat: 35.6366, lng: 139.7930 },
    "saitama super arena":           { lat: 35.8949, lng: 139.6308 },
    "makuhari messe":                { lat: 35.6482, lng: 140.0342 },
    "yoyogi national gymnasium":     { lat: 35.6673, lng: 139.6987 },
    "toyosu pit":                    { lat: 35.6489, lng: 139.7896 },
    "zepp divercity":                { lat: 35.6251, lng: 139.7756 },
  },
  dc: {
    "capital one arena":             { lat: 38.8981, lng: -77.0209 },
    "9:30 club":                     { lat: 38.9178, lng: -77.0234 },
    "930 club":                      { lat: 38.9178, lng: -77.0234 },
    "anthem":                        { lat: 38.8783, lng: -77.0243 },
    "kennedy center":                { lat: 38.8957, lng: -77.0555 },
    "nationals park":                { lat: 38.8730, lng: -77.0074 },
    "lincoln theatre":               { lat: 38.9170, lng: -77.0284 },
    "howard theatre":                { lat: 38.9167, lng: -77.0218 },
  },
};

/**
 * Looks up a venue string against the known-venue table for a city.
 * Returns hand-verified coordinates or null when the venue is unknown.
 */
export function lookupKnownVenue(venueText: string, citySlug?: string): VenueCoords | null {
  if (!citySlug) return null;
  const slug = SLUG_ALIASES[citySlug] ?? citySlug;
  const table = KNOWN_VENUES[slug];
  if (!table) return null;
  const key = normalizeVenueName(venueText);
  if (!key) return null;
  return table[key] ?? null;
}

/**
 * City-disambiguation suffix appended to a venue name when the plain geocode
 * fails or lands outside the city bounds (e.g. "Dante's" → "Dante's,
 * Portland, Oregon"). Reduces same-name drift to other states.
 */
export const CITY_GEOCODE_HINTS: Record<string, string> = {
  austin:      "Austin, Texas",
  austincares: "Austin, Texas",
  brushycreek: "Round Rock, Texas",
  bulverde:    "Bulverde, Texas",
  portland:    "Portland, Oregon",
  sacramento:  "Sacramento, California",
  stlouis:     "St. Louis, Missouri",
  tokyo:       "Tokyo, Japan",
  dc:          "Washington, DC",
};
