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
# Dev through the workspace proxy
curl -s "http://localhost:80/api/events/digest/list" -H "Host: austin.eventcarpooling.com"

# Production
curl -s "https://austin.eventcarpooling.com/api/events/digest/list"
```

These GETs are public and filter past events; they are useful for finding the digest ID, not for backing up its stored events. Identify the target by tenant, ID, subject, and `weekOf`; an edition can contain events beyond its nominal week. When changing a live edition, inspect its current metadata and raw event array before writing. Read production data with the read-only database tool, then write via the city admin API. Never log a password hash or bearer token.

## Step 1: Generate a Digest

```
POST /api/events/digest/generate
{ "weekStart": "YYYY-MM-DD" }
```

Optional: `"weekEnd": "YYYY-MM-DD"` for an extended range (read directly from the request rather than the generated Zod body). Check the current handler before relying on this extension in production; deployment code can lag behind the workspace.

## Step 2: Add an Event from a URL

Use `parse-event-url` or inspect the source page to extract structured data. Verify its year, local time zone, weekday, venue, RSVP link, and image URL. `parse-event-url` can return an incorrect local time for a UTC timestamp; check it against the source.

```bash
# 1. Parse the URL (returns title, date, venue, description, imageUrl)
curl -s -X POST "/api/events/digest/{id}/parse-event-url" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"url":"https://partiful.com/e/..."}'

# 2. Read the complete stored events array (NOT the filtered /digest/latest or /digest/list response).
# 3. Append or chronologically insert the new event; preserve all existing entries.
# 4. PATCH /api/events/digest/{id}/events with the full updated array.
```

> ⚠️ **PATCH replaces all events and rejects an empty array.** Public digest responses omit past events, even with admin authorization. Building a full replacement from those responses silently deletes retained historical events. Before patching, re-read the stored array and stop if it changed; after patching, confirm every original entry remains (unless removal was requested), new entries are ordered correctly, and both public pages and the email render them.

> ⚠️ Full-array PATCH validates/normalizes every entry through `EventItemSchema` and auto-tags events beyond the nominal week as featured. Keep spotlight/community-post flags and required string fields intact.

> ⚠️ **Use `-d @file` not piped stdin** — piping JSON into curl can silently drop data. Always write to a temp file first. Even `-d @file` can return FAIL with 0 events if the token is wrong — always verify `success: true` and a non-zero event count before assuming the PATCH worked.

See `push-to-production` skill for the complete file-based patching workflow.

## Step 3: Patch Individual Event Fields

```
PATCH /api/events/digest/<digestId>/events/:idx/venue
{ "venue": "Corrected Venue Name, Address" }
```

For title/date/venue/category/description, `PATCH /api/events/digest/:id/events/:idx` updates one **raw stored-array index**; a filtered public-array index may be different. The per-index route does **not** accept coordinates, link, image, source, or spotlight flags. For those use the full-array PATCH, preserving the stored entries. Changing a venue triggers geocoding.

## Step 4: Set Spotlight

```
POST /api/events/digest/<digestId>/spotlight
{ "url": "https://...", "type": "business", "title": "Business Name", "description": "One sentence about them." }

POST /api/events/digest/<digestId>/spotlight
{ "url": "https://...", "type": "community", "title": "Nonprofit Name", "description": "One sentence about them." }
```

Call the endpoint **once per spotlight** — one call for `type: "business"` and a separate call for `type: "community"`. Do NOT use the old `{ businessSpotlight, communitySpotlight }` shape — that is the wrong endpoint.

This endpoint **appends**; it does not replace an existing spotlight. To replace one, read the raw stored array, update the single `isBusinessSpotlight` or `isPost` object in place (including title/link/description/source), and full-array PATCH it. Verify there is exactly one intended spotlight of that type and all other entries remain. The response's `digest.events` is filtered and is not a safe source for a subsequent replacement.

### Spotlight Audit (run before sending)

Business spotlights (`isBusinessSpotlight: true`) and community posts (`isPost: true`) live inside the `events` array alongside regular events. They can accumulate duplicates or carry placeholder text if added more than once.

**Check for duplicates and bad descriptions:**
```python
for i, e in enumerate(events):
    if e.get('isBusinessSpotlight') or e.get('isPost'):
        print(f"[{i}] {e.get('title')} | {e.get('link')} | desc: {e.get('description','')[:80]}")
```

Watch for:
- **Duplicate spotlights by link** — same `link` appearing twice with different titles (e.g. one real title + one generic "Global AI startup based in Tokyo"). Keep the first, remove the second.
- **Duplicate spotlights by title** — same title appearing twice even with different/null links (e.g. "Second Harvest Japan" appearing in both the first import and a carry-forward). Deduplicate by title for `isPost` entries too.
- **Placeholder/template descriptions** — WordPress/Avada demo copy like *"Create a cutting-edge website for cryptocurrency services with Avada…"* indicates the description was never properly filled in. Replace with accurate copy.
- **HTML entities in titles** — data from WordPress-based sites often contains `&#8211;` (en-dash), `&#8217;` (right quote), etc. Decode with `html.unescape()` before storing.

**Fix:** Work from the complete stored array (not a public filtered GET), filter/edit in JS, and PATCH back:
```js
// Deduplicate spotlights by title (for isPost) and by link (for isBusinessSpotlight)
const seenTitles = new Set();
const seenLinks = new Set();
const fixed = events.filter(e => {
  if (e.isPost) {
    if (seenTitles.has(e.title)) return false;
    seenTitles.add(e.title);
  }
  if (e.isBusinessSpotlight && e.link) {
    if (seenLinks.has(e.link)) return false;
    seenLinks.add(e.link);
  }
  return true;
});
```

## Step 5: Geocode Events (Do Before Sending)

Event-list PATCH triggers background geocoding for missing coordinates. Check coverage; if entries remain unlocated, trigger a retry and verify the result:

```bash
# Check coverage first
GET /api/events/digest/<digestId>/geocode-coverage
# → { total: N, geocoded: M, missing: N-M }

# Fire re-geocode (fire-and-forget — skips events already geocoded)
POST /api/events/digest/<digestId>/regeocoded
```

Geocoding is asynchronous, so check again after it finishes. Aim for 100% coverage before sending. Events without lat/lng won't appear on the digest map. If a full address still cannot be resolved, confirm coordinates from a trustworthy map source, re-read the raw array, and full-array PATCH that single entry's `lat`/`lng`; the per-index event route rejects those fields.

### Geocoding Drift Audit (run before sending)

Venue name–only strings like `"Atomic Lounge, St. Louis"` can silently geocode to a same-named venue in another city. Always audit coordinates against the city's bounding box before sending:

```python
# Approximate bounding boxes (lat_min, lat_max, lng_min, lng_max)
CITY_BOUNDS = {
  "austin":      (29.8, 30.7, -98.2, -97.4),
  "austincares": (29.8, 30.7, -98.2, -97.4),
  "stlouis":     (38.4, 38.9, -90.6, -90.0),
  "sacramento":  (38.4, 38.7, -121.6, -121.2),
  "portland":    (45.3, 45.7, -122.9, -122.3),
  "bulverde":    (29.3, 30.4, -98.8, -98.0),  # expanded — includes San Antonio metro
  "brushycreek": (30.3, 30.8, -98.0, -97.4),
  "tokyo":       (35.4, 35.9, 139.4, 139.9),
  "dc":          (38.7, 39.1, -77.5, -76.8),  # expanded west — includes Reston/N. Virginia
}
# Flag any event whose lat/lng falls outside the city box
```

**Fix pattern when drift is found:**
1. Update the event's `venue` to include a full street address (e.g. `"4140 Manchester Ave, St. Louis, MO 63110"` not just `"Atomic Cowboy, St. Louis"`)
2. Null out `lat`/`lng` on the bad events and PATCH the digest
3. Trigger `POST /api/events/digest/:id/regeocoded`
4. **If the geocoder still drifts** (same venue name exists in multiple cities — e.g. "Crest Theater" exists in both Sacramento and LA), hardcode the correct coordinates directly via PATCH instead of relying on re-geocoding

### Name-Only Venue Hardcoding

Nominatim frequently fails on name-only venue strings like `"Dante's, Portland"` or `"Golden 1 Center, Sacramento"`. The geocoder either returns nothing or picks a same-named venue in the wrong city. When a venue can't be geocoded by address enrichment, hardcode coordinates directly:

```js
// In a PATCH loop — match by venue string fragment, set known coords
const VENUE_COORDS = {
  // Portland
  "Dante's":                      [45.5231, -122.6784],
  "McMenamins Crystal Ballroom":  [45.5230, -122.6869],
  "Providence Park":              [45.5215, -122.6921],
  // Sacramento
  "Golden 1 Center":              [38.5805, -121.4994],
  "Crest Theater, Sacramento":    [38.5806, -121.4961],
  // St. Louis
  "Atomic Garage":                [38.6301, -90.2510],
  "The Golden Record":            [38.6270, -90.2160],
  // DC
  "STATION DC":                   [38.9037, -77.0013],
  "Lakewood Country Club":        [39.0590, -77.1540],
  // Austin
  "Q2 Stadium":                   [30.3877, -97.7195],
  "Stubb's Indoors":              [30.2669, -97.7363],
  // Add as needed — store in the PATCH loop, not in DB
};

events = events.map(e => {
  for (const [key, [lat, lng]] of Object.entries(VENUE_COORDS)) {
    if ((e.venue || "").includes(key)) return { ...e, lat, lng };
  }
  return e;
});
```

For city-level-only addresses (e.g. `"Sacramento, CA"`, `"Midtown Sacramento, CA"`) that can never be geocoded to a point, apply a city-center fallback pin so the event appears on the map rather than being invisible.

```python
# Hardcode correct coords when geocoder can't disambiguate
for e in events:
    if e['title'] == 'Bad Event':
        e['lat'] = 38.6274  # confirmed via Nominatim on full street address
        e['lng'] = -90.2518
        e['venue'] = '4140 Manchester Ave, St. Louis, MO 63110'
```

> ⚠️ Re-geocoding alone won't fix drift when the venue name is ambiguous across cities — you must fix the venue string AND set coords directly.

## Step 5b: Patch the Digest Intro

The intro text is stored separately from events and can be patched independently:

```bash
curl -s -X PATCH "https://CITY.eventcarpooling.com/api/events/digest/ID/intro" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"intro":"Hey Portland! Here'\''s your weekly curated guide..."}'
```

**When to use this:**
- After generating a digest whose auto-generated intro has the wrong city name (see "City Branding Audit" below)
- To add curator notes or a custom message without regenerating events
- Always check the intro before sending — the fallback used to say "Happy Sunday, Austin!" for all cities

**City-specific intros (reference):**
- Austin: "Hey Austin! I combed through X newsletters..." (from Gmail reader)
- St. Louis: "Hey St. Louis! With the help of AI..." (from `getStLouisSampleDigest`)
- Others: "Hey [City]!" + city-appropriate copy (now generated by `generateSampleDigest` with tenant info)

To change the subject or `weekOf` without rebuilding the events, use `PATCH /api/events/digest/:id/meta` with a nonempty `subject` and/or ISO `weekOf`. The email subject comes from `subject`; template date labels may come from `weekOf`. Keep the two consistent, then inspect the authenticated `GET /api/events/digest/:id/preview-email`. A change to the email *template code* does not affect production until published.

## Step 6: Send (Always Test First)

```text
# Draft to exactly one address; never omit testEmail for a draft
POST /api/events/digest/send
{ "digestId": <verified-digest-id>, "testEmail": "<intended-address>" }

# Full subscriber send: only with the user's explicit authorization
POST /api/events/digest/send
{ "digestId": <verified-digest-id>, "confirm": true }
```

Use `testEmail` — NOT `draftEmail` or `isDraft`. Confirm the city, digest ID, subject, intro, spotlight, upcoming events and intended address before calling send. Check HTTP status **and** `success: true`, and send only once. A test send does not update subscriber-wide `sentAt`/`sentCount`.

The current handler requires `confirm: true` when `testEmail` is absent; check the currently deployed behavior before a subscriber-wide send. Never infer permission for a full blast from “update the newsletter” or “send a draft.” Sending uses the stored digest but filters past dated events; community posts and spotlights are retained. The preview-email endpoint currently renders the raw event array, including historical events, so its event count may differ from what gets sent. Preview still helps verify the template, title, and spotlights.

## Deduplication Check Before Sending

Ticketmaster can return the same show with multiple performance dates. Review apparent duplicates by **title, date, venue and link**; do not delete a genuinely separate performance merely because its title matches. When removing a true duplicate, work from the complete stored list, not `/digest/latest`.

```js
// Work from the raw stored events, inspect same-title entries,
// remove only confirmed duplicates, then PATCH the full retained array.
```

Also watch for **generic vs specific title duplicates** — e.g. "Summer Stock Austin" and "Summer Stock Austin 2026: Newsies" from the same venue. Keep the specific titles, drop the generic catch-all.

## Removing Events From a Digest

Read the **raw stored event array** for the exact city and digest ID through the appropriate read-only database access. Remove only the requested entry, verify the remaining objects and count, then submit the **complete nonempty** replacement through authenticated `PATCH /api/events/digest/:id/events`. The public list filters historical entries and must never be used as the source of a replacement. Do not place bearer tokens in saved scripts or logs.

## City Branding Audit (Run Before First Send for Any City)

Before a city's first send and after regeneration, inspect its subject, intro, spotlight copy, city names, map, and email header in the authenticated preview. Austin-specific greetings and sample events have previously appeared in other tenants' drafts. The workspace's generate route currently limits sample-event fallback to Austin/St. Louis, but older production records or unpublished code can differ; check the actual edition rather than assuming the fix applies. Never send an empty draft or Austin-venue sample events for another city. `digestGenerator.ts` supplies city-aware fallback copy; `events.ts` controls generation; `emailService.ts` renders the tenant email theme. If a stored intro is wrong, patch only the intro using Step 5b.

## Carry-Forward of Manually-Curated Featured Events

When `POST /api/events/digest/generate` runs, it automatically carries forward any `featured: true` events from the **most recent existing digest** for that tenant whose dates are still >= the new `weekOf`. This prevents multi-week events, conferences, or anything added by hand from being silently dropped each week.

**How it works:**
- `carryForwardFeaturedEvents(tenantId, weekOf)` queries the single most-recent digest for the tenant (newest `weekOf DESC, id DESC`)
- Keeps only entries with `e.featured === true` (strict boolean)
- Parses the date using month-name format (`Jan`…`Dec` + 1–2 digit day); entries with unparseable dates are discarded
- Year is inferred from `weekOf`'s year — bumped by 1 if the resolved date falls before `weekOf` (Dec→Jan rollover support)
- Event is retained iff resolved date `>= weekOf` (same-day is kept; past featured events are not)
- Carried events are **appended after** live adapter + community events, then deduplicated — live events win on title+date collision
- The merged list then goes through category restriction and adult-content filtering; a carried event can still be removed by those filters
- The server logs `"Carried forward featured events from previous digest"` with the event titles when any fire

**What this covers:**
- Multi-week shows (e.g. "Summer Stock Austin 2026: Newsies" running Aug 9 AND Aug 16)
- Conferences spanning multiple days beyond the current week
- Any event manually PATCHed into a previous digest with `featured: true`

**Key implementation file:** `artifacts/api-server/src/routes/events.ts` → `carryForwardFeaturedEvents(tenantId, weekOf)`.

## AustinCares Digest Notes

AustinCares is a **deals site**, not a standard events digest. Read `add-austincares-deal` for how deals are curated, stored, and displayed; do not reuse an old week's deals or disguise them under a different category. Use absolute `https://` image URLs for email clients. Production runs the last published code, which can differ from the workspace; verify behavior rather than assuming a specific old/new version is deployed.

## Ticketmaster Classification Behaviour

When `POST /digest/generate` calls the Ticketmaster adapter, it passes a `classificationName` based on the category. Only **Music** and **Sports** are reliable Ticketmaster segment names — they return results for most cities. Classifications like `Arts & Theatre` and `Miscellaneous` frequently return 0 events even when events exist.

**The fix (applied in `ticketmaster.ts`):** `TM_CLASSIFICATION` now only maps `Music → "Music"` and `Sports → "Sports"`. All other categories (Arts, Tech, Wellness, Civics) query Ticketmaster **without** a classification filter, returning a broader result set that `filterByTenantCategories()` then narrows locally via `guessCategory()`.

If a city gets only fallback events, check current adapter results, category filtering, and the deployed code before attempting a dev-to-production transfer. Never replace an existing digest from a filtered GET.

## Ticketmaster Geographic Accuracy Issues

Ticketmaster's city-name search can return events from a **different city with the same name**. Known example:

- **Portland, OR search returns Portland Sea Dogs** — those are a baseball team in Portland, **Maine**. Always manually remove cross-state events that slip through.

Mitigation in code: `stateCode` is always passed for US cities (e.g. `stateCode=OR` for Portland). But Ticketmaster sometimes ignores stateCode for certain event types. Always review the event list before sending — filter out anything that lists a venue clearly outside the city's metro area.

## Stale Event Filtering

Past events are filtered **at the API response layer** inside `digestToApi()` in `events.ts` via `filterStaleEvents()`. This runs on every `GET /digest/latest` and `GET /digest/list` call, for every city, regardless of whether the digest was sent or not.

Rules:
- Events with a parsed date before today (midnight) are stripped from the response
- **Only** spotlights (`isBusinessSpotlight`) and community posts (`isPost`) are unconditionally kept — they have no event date
- `featured: true` ("Special Events") are **NOT** exempt — they have a real date and are removed once that date passes
- Events whose date string can't be parsed are kept (safe default)

**Year boundary caution:** The current API filter infers the event year from today's calendar year and special-cases November/December when today is in January/February; it does **not** derive year from digest `weekOf`. Audit December→January events on both the public API and email before sending. The email send path has its own date filter, so do not assume preview, public pages, and outgoing email always show identical sets.

> ⚠️ Do not add `ev.featured` back to the "always keep" list. `autoTagFutureEvents` marks events beyond the digest week's Saturday as `featured: true`, but they still have a date. Exempting featured events caused sent digests to accumulate stale "Special Events" indefinitely (e.g. Sacramento showing Aug 2–7 events weeks later).

The client-side filter in `digest.tsx` (`upcomingEvents`) also applies `isEventTodayOrLater()` to all events including featured — it does **not** short-circuit on `e.featured`.

A separate nightly `scheduleDailyCleanup()` job (2 AM) also removes stale events from **unsent** digests at the DB level. Both layers work together — the API-layer filter is the safety net for sent digests.

## Fixing Individual Event Dates

To correct a day-of-week / numerical date mismatch on a live production event:

```
PATCH /api/events/digest/:digestId/events/:idx
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "date": "Wednesday, Aug 19 at 5:30 PM" }
```

- `:idx` is the **0-based index** of the event in the digest's events array
- Find the index in the complete **stored** array, not the filtered API response.
- Only title/date/venue/category/description string fields are accepted; omitting a field leaves it unchanged.
- To check all cities for mismatches, fetch `/api/events/digest/list` for each city, parse each date string, and compare the stated weekday against the event's actual year/month/day. The public list may omit past records; audit raw records when needed.

## City-Scoped Digest Queries

All digest queries (`/api/events/digest/latest`, `/api/events/digest/list`) are scoped to the **requesting tenant** via `req.tenant!.id`. This means every city's subdomain returns that city's own digest — no city ever falls back to Austin's.

- Tenant is resolved from the request host in `resolveTenant.ts` (subdomain → slug → DB lookup)
- The frontend (`home.tsx`, `digest.tsx`) calls the same `/api/events/digest/latest` URL without any city param — city identity comes entirely from the request host/tenant context
- In dev, the tenant is set via the `Host:` header or a dev default (slug `austin`)

## Community Events (Always Merged In)

The generate endpoint always calls `buildCommunityEvents()` after adapter results and merges community events via `deduplicateEvents()`. Community events are curated recurring local events defined in `weeklyRefresh.ts` (COMMUNITY_EVENTS map, keyed by tenant slug).

Cities with defined community events in the current code: **austin, austincares, sacramento, portland, bulverde, stlouis, dc**.
Cities with NO community events defined: **brushycreek** (relies entirely on adapters).

Inspect the current `COMMUNITY_EVENTS` and `TENANT_CONFIGS` in `weeklyRefresh.ts` rather than relying on a copied list. Verify merged entries and their locations after generation; trigger `POST /digest/:id/regeocoded` if coverage remains incomplete.

## Event Source Adapter Status

Adapter availability and credentials change. Check `registry.ts`, the current tenant config, and the generation response's source results for each run. Do not assume an adapter is working or broken based on an old digest. The Ticketmaster adapter uses Music/Sports classifications and queries more broadly for other categories.

## Relevant Files

- `artifacts/api-server/src/routes/events.ts` — all digest endpoints; `filterStaleEvents()` and `digestToApi()`
- `artifacts/api-server/src/lib/dailyCleanup.ts` — nightly DB-level cleanup (unsent digests only)
- `artifacts/api-server/src/lib/emailService.ts` — email rendering and sending
- `artifacts/austin-events/src/pages/admin.tsx` — admin UI
- `artifacts/api-server/src/lib/eventSources/registry.ts` — adapter-to-category wiring
- `artifacts/api-server/src/lib/eventSources/ticketmaster.ts` — Ticketmaster adapter (TM_CLASSIFICATION)
- `artifacts/api-server/src/lib/weeklyRefresh.ts` — community events (COMMUNITY_EVENTS map)
