---
name: Geocoding drift
description: Venue name–only strings geocode to same-named venues in other cities. Audit pattern and fix workflow.
---

# Geocoding Drift

## The Problem
Venue strings like `"Atomic Lounge, St. Louis"` or `"Atomic Cowboy, St. Louis"` can silently geocode to the same-named venue in another city. Confirmed examples:
- `"Atomic Lounge, St. Louis"` → Las Vegas (lat 36.15, lng -115.15)
- `"Atomic Garage, St. Louis"` → Des Moines, IA (lat 41.57, lng -93.70)
- `"Atomic Cowboy, 4140 Manchester Ave, St. Louis, MO 63110"` → Denver (there's an Atomic Cowboy there too)

The geocoder finds the most prominent match for the name, which is not always in the right city.

## DC-Specific Drift Warning
"Washington" alone geocodes to Washington State (lat ~47, lng ~-120). Always use "Washington, DC" in venue strings. Even then, first-pass geocoding can drift:
- The Sage → WA state (47.4472, -120.3778); hardcoded to 38.8993, -77.0284
- The National Theatre → Africa (2.03, 45.33); hardcoded to 38.8951, -77.0283
Always run the bounding-box audit for DC: lat 38.5–39.2, lng -77.5 to -76.7.

## Audit Before Sending
Check all geocoded events against the city bounding box:
```
stlouis:    lat 37–40, lng -96 to -88
austin:     lat 29.8–30.6, lng -98.1 to -97.4
sacramento: lat 38.3–38.8, lng -121.7 to -121.2
portland:   lat 45.2–45.8, lng -122.9 to -122.3
bulverde:   lat 29.5–30.1, lng -98.6 to -98.0
tokyo:      lat 35.5–35.9, lng 139.5 to 140.0
dc:         lat 38.5–39.2, lng -77.5 to -76.7
```

## Fix Workflow
1. Update `venue` to full street address (e.g. `"4140 Manchester Ave, St. Louis, MO 63110"`)
2. Null out `lat`/`lng` on bad events, PATCH the digest
3. Trigger `POST /api/events/digest/:id/regeocoded`
4. If geocoder still drifts (ambiguous name across cities), hardcode coords confirmed via Nominatim on the full address — do NOT rely on re-geocoding alone

## How to Apply
Run the bounding-box audit after every generate + re-geocode, before sending. If any event falls outside the box, fix the venue string and hardcode coords.

Street-intersection searches can return a point elsewhere on one of the named streets, even inside the correct city. Leave the pin unassigned until the actual junction is verified.

**Why:** A Great Highway/Taraval search returned a Great Highway segment far north of the requested intersection; city bounds alone would accept it.

**How to apply:** Check the returned place identity and junction, not just the city. Organizer-linked map place coordinates are preferable to a street midpoint.

**Why:** Re-geocoding alone won't fix drift when the venue name exists in multiple cities. The venue string must be unambiguous (full address) AND coords may need to be set directly.

**Update (Aug 2026):** ingest-time defenses now exist: `knownVenues.ts` hand-verified venue→coord table (checked before cache/geocoders; add recurring failures there), a second Nominatim pass with a city/state hint when pass 1 is out of bounds, and Ticketmaster venue strings now include street address line1.

## Regional listings are not meeting points

Do not pin a regional spotlight or river-wide event at the geocoder's centroid. Leave it unmapped unless a specific venue or viewing point is verified.

**Why:** Boston's river-wide regatta resolved to a remote river segment, and “Greater Boston” resolved to a location unrelated to the volunteer spotlight. Both passed the metro radius check.

**How to apply:** Audit place identity as well as city bounds after geocoding; a successfully returned coordinate is not proof of a correct meeting point.

## Venue-level errors inside the right city

Ticketmaster coordinates and internal known-venue entries are not sufficient proof of the correct building, even when both pass city bounds.

**Why:** A venue audit found several Ticketmaster pins hundreds of metres or kilometres from the named address, and some internal lookup coordinates also disagreed with current map place identities.

**How to apply:** Verify the venue name and street address against a current trustworthy map. Inspect the returned place type as well: a nearby bus stop is not the museum or theatre. Apply confirmed coordinate repairs without changing unrelated edition fields.

## Los Angeles geocoding queries

For Los Angeles, long API-supplied venue strings may return no Nominatim result even when the venue is real. A simplified venue name or verified street address with a California/Los Angeles qualifier can resolve it. Check the returned place identity; do not substitute a campus centroid or nearby business for a named building.

**Why:** In the October 2026 LA edition, simplified queries resolved several venues that full event strings did not, while one campus-address query matched a nearby business.

**How to apply:** For `la` venues, retry with a concise venue name or verified address plus Los Angeles/California, then confirm the result is the intended place and within the city's radius. Leave the pin unset when the specific venue cannot be verified.
