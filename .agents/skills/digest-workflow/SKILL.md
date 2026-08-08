---
name: digest-workflow
description: Generate, review, patch, and send a city's weekly event digest. Use when the user asks to create, update, or send a weekly digest for any city on the platform (Austin, Sacramento, Portland, St. Louis, Brushy Creek, Bulverde, Tokyo, AustinCares, etc.).
---

# Digest Workflow

## Key Concepts

- Each city is a **tenant** identified by a slug (e.g. `austin`, `stlouis`, `tokyo`, `austincares`).
- A **digest** is a weekly curated list of events. Identified by numeric `digestId`.
- Dev and production digests are completely separate — changes to dev don't affect production and vice versa.
- Use the `admin-api-auth` skill to get the right token for whichever environment you're targeting.

## Finding the Right Digest

```bash
# Dev
curl -s "http://localhost:$PORT/api/events/digest/list" -H "Host: austin.eventcarpooling.com" \
  -H "Authorization: Bearer $DEV_TOKEN"

# Production
curl -s "https://austin.eventcarpooling.com/api/events/digest/list" \
  -H "Authorization: Bearer $PROD_TOKEN"
```

Find the digest whose `weekOf` covers the target date.

## Step 1: Generate a Digest

```
POST /api/events/digest/generate
{ "weekStart": "2026-08-10" }   // Monday of target week (YYYY-MM-DD)
```

Optional: `"weekEnd": "2026-08-16"` for multi-day ranges (bypasses Zod — intentional).

## Step 2: Add an Event from a URL

Use `parse-event-url` to extract structured data, then manually append to the events list and PATCH:

```bash
# 1. Parse the URL (returns title, date, venue, description, imageUrl)
curl -s -X POST "/api/events/digest/{id}/parse-event-url" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"url":"https://partiful.com/e/..."}'

# 2. Fetch current events, append new one, write to file
# 3. PATCH /api/events/digest/{id}/events with full updated array
```

> ⚠️ **PATCH replaces all events** — always fetch the existing list first and append; never send only the new event.

> ⚠️ **Time zone:** `parse-event-url` returns times in UTC. Manually convert to local city time (Austin = CDT = UTC−5).

> ⚠️ **Use `-d @file` not piped stdin** — piping JSON into curl can silently drop data. Always write to a temp file first.

See `push-to-production` skill for the complete file-based patching workflow.

## Step 3: Patch Individual Event Fields

```
PATCH /api/events/digest/<digestId>/events/:idx/venue
{ "venue": "Corrected Venue Name, Address" }
```

Or use `PATCH /digest/:id/events` with the full array to edit any field.

## Step 4: Set Spotlight

```
POST /api/events/digest/<digestId>/spotlight
{
  "businessSpotlight": { "name": "...", "description": "...", "url": "..." },
  "communitySpotlight": { "name": "...", "description": "...", "url": "..." }
}
```

## Step 5: Send (Always Test First)

```bash
# Test send to one address
POST /api/events/digest/send
{ "digestId": 123, "testEmail": "raj@example.com" }

# Send to all subscribers (omit testEmail)
POST /api/events/digest/send
{ "digestId": 123 }
```

Use `testEmail` — NOT `draftEmail` or `isDraft` (wrong field names cause a full subscriber send).

## AustinCares Digest Notes

AustinCares digests are **restricted to Civics and Wellness categories only** — enforced at ingest in `applyTenantCategoryRestriction()`. All other event categories are silently filtered out. If a digest generates with 0 events, this restriction is likely the cause.

## Geocoding

```
GET /api/events/digest/<digestId>/geocode-coverage
```

Aim for 100% before sending — events without lat/lng won't appear on the digest map.

## Stale Event Filtering

Past events are filtered **at the API response layer** inside `digestToApi()` in `events.ts` via `filterStaleEvents()`. This runs on every `GET /digest/latest` and `GET /digest/list` call, for every city, regardless of whether the digest was sent or not.

Rules:
- Events with a parsed date before today (midnight) are stripped from the response
- Spotlights (`isBusinessSpotlight`), community posts (`isPost`), and featured/Special Events (`featured: true`) are **never** removed
- Events whose date string can't be parsed are kept (safe default)

A separate nightly `scheduleDailyCleanup()` job (2 AM) also removes stale events from **unsent** digests at the DB level. Both layers work together — the API-layer filter is the safety net for sent digests.

## Relevant Files

- `artifacts/api-server/src/routes/events.ts` — all digest endpoints; `filterStaleEvents()` and `digestToApi()`
- `artifacts/api-server/src/lib/dailyCleanup.ts` — nightly DB-level cleanup (unsent digests only)
- `artifacts/api-server/src/lib/emailService.ts` — email rendering and sending
- `artifacts/austin-events/src/pages/admin.tsx` — admin UI
