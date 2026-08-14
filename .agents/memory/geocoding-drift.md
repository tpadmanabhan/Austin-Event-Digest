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

**Why:** Re-geocoding alone won't fix drift when the venue name exists in multiple cities. The venue string must be unambiguous (full address) AND coords may need to be set directly.
