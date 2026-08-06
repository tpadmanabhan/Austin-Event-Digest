---
name: add-austincares-deal
description: Add a new deal to the AustinCares deals page and map. Use when the user wants to add, update, or remove a business deal on austincares.eventcarpooling.com — either as a static (curated) entry or a community submission.
---

# Add AustinCares Deal

There are two types of deals on the AustinCares page:

## 1. Static (Curated) Deals

Hardcoded in `artifacts/austin-events/src/pages/austin-cares-full.tsx` in the `STATIC_DEALS` array at the top of the file (~line 37).

**Shape:**
```ts
{
  day: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN" | "ANY DAY" | "WEEKLY",
  business: string,
  deal: string,
  savings: string,
  source: "Direct" | "Groupon" | "Community",
  location: string,       // human-readable address
  url?: string,           // optional link
  imageUrl?: string,      // optional: "/api/storage/objects/uploads/<uuid>"
  lat: number,            // required for map pin
  lng: number,            // required for map pin
  isSubmitted?: boolean,  // true for community-sourced entries
}
```

**Always include `lat` and `lng`** — deals without coordinates are silently excluded from the map (`mappedDeals` filter at line ~641).

Use static entries for: featured partners, manually curated deals, any deal that needs to always appear regardless of DB state.

## 2. Community Submitted Deals

Stored in the `submitted_deals` table in the dev/prod PostgreSQL database. Submitted via `POST /deals/submit` or the AustinCares submission form.

The startup migration (`artifacts/api-server/src/lib/startupMigration.ts`) back-fills `lat`/`lng` for submitted deals with null coordinates on server restart. If a pin is missing on the map, the record likely has null lat/lng — either restart the API server to trigger backfill, or patch it directly in the DB.

**Table columns:** `id`, `business_name`, `deal_description`, `location_address`, `contact_name`, `contact_email`, `savings`, `day_of_week`, `photo_url`, `lat`, `lng`, `created_at`

## Map Pin Visibility

The map only renders deals where `d.lat != null && d.lng != null`. Static deals and submitted deals are merged in the frontend — static entries take precedence over submitted ones with the same business name (deduped by lowercase name).

## Where to Look

- `artifacts/austin-events/src/pages/austin-cares-full.tsx` — STATIC_DEALS array, map rendering logic, deal cards
- `artifacts/austin-events/src/pages/austin-cares-deals.tsx` — deals landing page
- `artifacts/api-server/src/routes/deals.ts` — `GET /deals/submitted`, `POST /deals/submit`
- `artifacts/api-server/src/lib/startupMigration.ts` — geocode backfill logic

## Spokesman Coffee (reference entry)

```ts
{
  day: "MON",
  business: "Spokesman Coffee",
  deal: "Free drip coffee with any pastry purchase",
  savings: "Free drip",
  source: "Direct",
  location: "4900 N Lamar Blvd #110, Austin",
  url: "https://www.spokesmancoffee.com",
  lat: 30.3330,
  lng: -97.7388,
}
```
