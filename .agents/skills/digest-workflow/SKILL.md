---
name: digest-workflow
description: Generate, review, patch, and send a city's weekly event digest. Use when the user asks to create, update, or send a weekly digest for any city on the platform (Austin, Sacramento, Portland, St. Louis, Brushy Creek, Bulverde, Tokyo, AustinCares, etc.).
---

# Digest Workflow

## Key Concepts

- Each city is a **tenant** identified by a slug (e.g. `austin`, `stlouis`, `tokyo`, `austincares`).
- A **digest** is a weekly curated list of events for a tenant. Identified by numeric `digestId`.
- The admin panel at `https://<city>.eventcarpooling.com/admin` is the primary UI for managing digests.
- All API calls require an **admin auth token** — see the `admin-api-auth` skill.

## Step 1: Generate a Digest

```
POST /api/events/digest/generate
Host: <city>.eventcarpooling.com
Authorization: Bearer <admin-token>
{ "weekStart": "2026-08-10" }   // Monday of target week (YYYY-MM-DD)
```

Optional: `"weekEnd": "2026-08-16"` for multi-day ranges.

This creates a new digest with auto-fetched events (Ticketmaster + any configured scrapers).

## Step 2: Review & Patch Events

Individual event fields can be corrected without regenerating the whole digest:

```
PATCH /api/events/digest/<digestId>/event/<eventId>
{ "category": "Music", "venue": "Stubb's Amphitheater", "date": "2026-08-12" }
```

Add an event from a URL:
```
POST /api/events/digest/<digestId>/add-url
{ "url": "https://eventbrite.com/e/..." }
```

Delete a single event:
```
DELETE /api/events/digest/<digestId>/event/<eventId>
```

## Step 3: Set Spotlight

Each digest can have a Business Spotlight and a Community Spotlight:
```
PATCH /api/events/digest/<digestId>
{
  "businessSpotlight": { "name": "...", "description": "...", "url": "..." },
  "communitySpotlight": { "name": "...", "description": "...", "url": "..." }
}
```

## Step 4: Send (Test First)

Always send a **test** to a single email before sending to all subscribers:
```
POST /api/events/digest/send
{
  "digestId": 123,
  "testEmail": "raj@example.com"   // use `testEmail`, NOT `draftEmail` or `isDraft`
}
```

Send to all subscribers (omit `testEmail`):
```
POST /api/events/digest/send
{ "digestId": 123 }
```

⚠️ **Warning:** Omitting `testEmail` sends to all subscribers. Always test first.

## Geocoding

After importing events, the server back-fills lat/lng for venues. Check coverage:
```
GET /api/events/digest/<digestId>/geocode-status
```
The admin panel shows a geocode coverage indicator — aim for 100% before sending. Events without lat/lng won't appear on the map in the email.

## Custom Date Ranges

The `generate` endpoint accepts `weekEnd` for multi-day ranges (this field bypasses Zod schema validation — it's intentional). Useful for special editions.

## Pushing to Production

Use `POST /api/events/digest/import` to push a cleaned digest to the production API. See the `push-to-production` skill for details.

## Relevant Files

- `artifacts/api-server/src/routes/events.ts` — all digest endpoints
- `artifacts/api-server/src/lib/emailService.ts` — email rendering and sending
- `artifacts/austin-events/src/pages/admin.tsx` — admin UI
