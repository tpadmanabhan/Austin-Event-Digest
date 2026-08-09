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

> ⚠️ **Use `-d @file` not piped stdin** — piping JSON into curl can silently drop data. Always write to a temp file first. Even `-d @file` can return FAIL with 0 events if the token is wrong — always verify `success: true` and a non-zero event count before assuming the PATCH worked.

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

### Spotlight Audit (run before sending)

Business spotlights (`isBusinessSpotlight: true`) and community posts (`isPost: true`) live inside the `events` array alongside regular events. They can accumulate duplicates or carry placeholder text if added more than once.

**Check for duplicates and bad descriptions:**
```python
for i, e in enumerate(events):
    if e.get('isBusinessSpotlight') or e.get('isPost'):
        print(f"[{i}] {e.get('title')} | {e.get('link')} | desc: {e.get('description','')[:80]}")
```

Watch for:
- **Duplicate spotlights** — same `link` appearing twice with different titles (e.g. one real title + one generic "Global AI startup based in Tokyo"). Keep the first, remove the second via index in the patched events array.
- **Placeholder/template descriptions** — WordPress/Avada demo copy like *"Create a cutting-edge website for cryptocurrency services with Avada…"* indicates the description was never properly filled in. Replace with accurate copy.
- **HTML entities in titles** — data from WordPress-based sites often contains `&#8211;` (en-dash), `&#8217;` (right quote), etc. Decode with `html.unescape()` before storing.

**Fix:** Fetch all events, filter/edit in Python, write to temp file, PATCH back:
```python
import html as html_lib
for e in events:
    if e.get('isBusinessSpotlight'):
        e['title'] = html_lib.unescape(e['title'])  # decode &#8211; → –
# Remove duplicates: filter out any isBusinessSpotlight with same link as a previous one
seen_links = set()
fixed = []
for e in events:
    key = e.get('link') if (e.get('isBusinessSpotlight') or e.get('isPost')) else None
    if key and key in seen_links:
        continue  # drop duplicate spotlight
    if key:
        seen_links.add(key)
    fixed.append(e)
```

## Step 5: Geocode Events (Do Before Sending)

After generating or patching events, trigger re-geocoding so all events get lat/lng for the map:

```bash
# Check coverage first
GET /api/events/digest/<digestId>/geocode-coverage
# → { total: N, geocoded: M, missing: N-M }

# Fire re-geocode (fire-and-forget — skips events already geocoded)
POST /api/events/digest/<digestId>/regeocoded
```

Community events added via PATCH will not be geocoded automatically — always trigger re-geocode after patching. Aim for 100% coverage before sending. Events without lat/lng won't appear on the digest map.

### Geocoding Drift Audit (run before sending)

Venue name–only strings like `"Atomic Lounge, St. Louis"` can silently geocode to a same-named venue in another city. Always audit coordinates against the city's bounding box before sending:

```python
# Approximate bounding boxes (lat_min, lat_max, lng_min, lng_max)
CITY_BOUNDS = {
  "austin":     (29.8, 30.6, -98.1, -97.4),
  "stlouis":    (37.0, 40.0, -96.0, -88.0),
  "sacramento": (38.3, 38.8, -121.7, -121.2),
  "portland":   (45.2, 45.8, -122.9, -122.3),
  "bulverde":   (29.5, 30.1, -98.6, -98.0),
  "brushycreek":(30.4, 30.7, -97.9, -97.5),
  "tokyo":      (35.5, 35.9, 139.5, 140.0),
}
# Flag any event whose lat/lng falls outside the city box
```

**Fix pattern when drift is found:**
1. Update the event's `venue` to include a full street address (e.g. `"4140 Manchester Ave, St. Louis, MO 63110"` not just `"Atomic Cowboy, St. Louis"`)
2. Null out `lat`/`lng` on the bad events and PATCH the digest
3. Trigger `POST /api/events/digest/:id/regeocoded`
4. **If the geocoder still drifts** (same venue name exists in multiple cities — e.g. "Atomic Cowboy" in both St. Louis and Denver), hardcode the correct coordinates directly via PATCH instead of relying on re-geocoding

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

## Step 6: Send (Always Test First)

```bash
# Test send to one address
POST /api/events/digest/send
{ "digestId": 123, "testEmail": "raj@example.com" }

# Send to all subscribers (omit testEmail)
POST /api/events/digest/send
{ "digestId": 123 }
```

Use `testEmail` — NOT `draftEmail` or `isDraft` (wrong field names cause a full subscriber send).

`digestId` is **required** in the body — omitting it returns `invalid_request`.

## Deduplication Check Before Sending

Ticketmaster returns the same show with multiple performance dates as separate events — all with the same title. Always check for duplicates before sending and deduplicate by title (keep the first occurrence):

```js
// Fetch digest events, dedup by title, PATCH back
const allEvts = dig.events;
const seen = new Set();
const deduped = allEvts.filter(e => {
  if (e.isPost || e.isBusinessSpotlight) return true; // keep spotlights always
  const key = e.title?.toLowerCase().trim();
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
// Write deduped to file, PATCH /api/events/digest/:id/events
```

Also watch for **generic vs specific title duplicates** — e.g. "Summer Stock Austin" and "Summer Stock Austin 2026: Newsies" from the same venue. Keep the specific titles, drop the generic catch-all.

## Removing Events From a Digest

Fetch the full event list, filter out unwanted events, write to a temp file, then PATCH:

```bash
node -e "
async function run() {
  const lr = await fetch('https://CITY.eventcarpooling.com/api/events/digest/list', {
    headers: { Authorization: 'Bearer TOKEN' }
  });
  const dig = (await lr.json()).digests[0];
  const filtered = dig.events.filter(e => !e.title?.match(/Unwanted Event Title/i));
  const fs = require('fs');
  fs.writeFileSync('/tmp/patch.json', JSON.stringify({ events: filtered }));
  console.log('Keeping', filtered.length, 'of', dig.events.length);
}
run();
"
curl -s -X PATCH "https://CITY.eventcarpooling.com/api/events/digest/ID/events" \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d @/tmp/patch.json
```

## City Branding Audit (Run Before First Send for Any City)

A recurring audit step — run before sending a city's digest for the first time or after regeneration:

**1. Check intro text for Austin bleed:**
```sql
-- Production
SELECT slug, d.id, LEFT(d.intro, 80) FROM tenants t
JOIN digests d ON d.tenant_id = t.id AND d.week_of = '2026-08-09'
WHERE t.slug IN ('sacramento','bulverde','portland','brushycreek','stlouis','tokyo');
```
Look for "Austin" or "🤠" in non-Austin city intros. If found, PATCH with a city-specific intro (see Step 5b).

**2. Confirmed root causes (now fixed in code):**
- `generateSampleDigest()` used to always produce "Happy Sunday, Austin!" — now accepts tenant param and generates city-specific intro/subject/emoji
- Gmail reader intro ("Hey Austin! I combed through X newsletters 🤠") used to leak into ALL city digests when Gmail returned events — now gated to `slug === "austin"` only in the generate endpoint
- AustinCares promo block in email body said "🏷️ Now Live **in Austin**" for all cities — now reads "🏷️ New · Austin Cares / The best local deals, curated every week."

**3. Per-city subject emoji (now correct in code):**
| City | Emoji |
|------|-------|
| Austin / Brushy Creek | 🤠 |
| St. Louis | ⚾ |
| Sacramento | 👑 |
| Portland | 🌲 |
| Bulverde | 🌿 |
| Tokyo | 🗼 |
| AustinCares | 🏷️ |

**4. Relevant files:**
- `artifacts/api-server/src/lib/digestGenerator.ts` → `generateSampleDigest(weekOf, customNotes, tenant)` — city-aware fallback intro/subject
- `artifacts/api-server/src/routes/events.ts` → generate endpoint, line `introBase` — Gmail intro gated to Austin
- `artifacts/api-server/src/lib/emailService.ts` → AustinCares promo block, subject emoji map

## Carry-Forward of Manually-Curated Featured Events

When `POST /api/events/digest/generate` runs, it automatically carries forward any `featured: true` events from the **most recent existing digest** for that tenant whose dates are still >= the new `weekOf`. This prevents multi-week events, conferences, or anything added by hand from being silently dropped each week.

**How it works:**
- After merging live adapter results + community events, the generate endpoint queries the previous digest
- Featured events with a parseable future date are appended and deduplicated by `title|date`
- Live-sourced events win on title+date collision (they come first in dedup); carry-forward fills the gaps
- The server logs `"Carried forward featured events from previous digest"` with the event titles when any fire

**What this covers:**
- Multi-week shows (e.g. "Summer Stock Austin 2026: Newsies" running Aug 9 AND Aug 16)
- Conferences spanning multiple days beyond the current week (e.g. "Fed Supernova 2026 Conference" Aug 18–20)
- Any event manually PATCHed into a previous digest with `featured: true`

**Key implementation file:** `artifacts/api-server/src/routes/events.ts` → `carryForwardFeaturedEvents(tenantId, weekOf)`

## AustinCares Digest Notes

AustinCares is a **weekly deals site**, not an events site. Its digest is populated manually with the current week's deals (from `STATIC_DEALS` in `austin-cares-full.tsx`), not auto-generated from event adapters.

**Category restriction — production workaround:** The old restriction (`Civics + Wellness only`) has been removed in dev code (`applyTenantCategoryRestriction` RESTRICTIONS map is now empty). Until the next deploy, production still enforces it. When PATCHing deals to production, use `category: "Wellness"` on all deal objects so they pass through. After deploy, use `category: "Food & Markets"`.

**Deals as events format:** Each deal is an event-like object with:
- `date`: Saturday of the current week (e.g. "Saturday, Aug 15") so all deals stay visible all week
- `venue`: full street address of the business
- `category`: `"Wellness"` (prod workaround) or `"Food & Markets"` (post-deploy)
- `source`: `"Direct"` | `"Groupon"` | `"Community"`
- `lat`/`lng`: coordinates for map pins (required — missing pins are excluded from map)
- `imageUrl`: **must be an absolute URL** (`https://austincares.eventcarpooling.com/api/storage/objects/uploads/<uuid>`). Relative paths silently fail in email clients. Dev code now auto-resolves relative URLs using `digest.siteUrl`, but always store absolute URLs in deal data to be safe on both old and new prod code.

**Email:** AustinCares digest email renders "This Week's Deals 🏷️" (not "This Week's Picks"), "Deal locations in Austin" on the map, and a prominent teal CTA block linking to `https://austincares.eventcarpooling.com/full`.

## Dev vs Production Generate Quality Gap

The production server runs the last deployed build. Until a new deploy ships, `POST /digest/generate` on production still uses the old `TM_CLASSIFICATION` mapping, which sends `"Arts & Theatre"` and `"Miscellaneous"` to Ticketmaster — those return 0 events for most cities (the fix is in dev code only).

**Workaround (before deploy):**
1. Generate on the dev server: `POST http://localhost:$PORT/api/events/digest/generate` with the correct `Host:` header
2. Save the events from the dev digest to a file
3. Generate a blank digest on production (it may fall back to sample data — that's OK)
4. PATCH the production digest with the dev events using the push-to-production skill

Austin comparison: production got **4 events** with old code; dev got **21 events** with TM fix. Same week, same city.

## Ticketmaster Classification Behaviour

When `POST /digest/generate` calls the Ticketmaster adapter, it passes a `classificationName` based on the category. Only **Music** and **Sports** are reliable Ticketmaster segment names — they return results for most cities. Classifications like `Arts & Theatre` and `Miscellaneous` frequently return 0 events even when events exist.

**The fix (applied in `ticketmaster.ts`):** `TM_CLASSIFICATION` now only maps `Music → "Music"` and `Sports → "Sports"`. All other categories (Arts, Tech, Wellness, Civics) query Ticketmaster **without** a classification filter, returning a broader result set that `filterByTenantCategories()` then narrows locally via `guessCategory()`.

**If a city gets only sample/fallback events after generating:**
1. Check whether the tenant has `Music` or `Sports` in its categories.
2. Without them, older deployed code (before the fix) would send `Arts & Theatre` or `Miscellaneous` and get 0 events, triggering the sample fallback.
3. Workaround (before a new deploy): generate on dev (which has the fix), fetch the events, then PATCH to the production digest using the push-to-production skill.

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

> ⚠️ Do not add `ev.featured` back to the "always keep" list. `autoTagFutureEvents` marks events beyond the digest week's Saturday as `featured: true`, but they still have a date. Exempting featured events caused sent digests to accumulate stale "Special Events" indefinitely (e.g. Sacramento showing Aug 2–7 events weeks later).

The client-side filter in `digest.tsx` (`upcomingEvents`) also applies `isEventTodayOrLater()` to all events including featured — it does **not** short-circuit on `e.featured`.

A separate nightly `scheduleDailyCleanup()` job (2 AM) also removes stale events from **unsent** digests at the DB level. Both layers work together — the API-layer filter is the safety net for sent digests.

## Community Events (Always Merged In)

The generate endpoint always calls `buildCommunityEvents()` after adapter results and merges community events via `deduplicateEvents()`. Community events are curated recurring local events defined in `weeklyRefresh.ts` (COMMUNITY_EVENTS map, keyed by tenant slug).

Cities with defined community events: **austincares, sacramento, portland, bulverde, stlouis**.
Cities with NO community events defined: **austin, brushycreek** (rely entirely on adapters).

Community events are NOT geocoded automatically at merge time — always fire `POST /digest/:id/regeocoded` after building a digest that includes them.

## Event Source Adapter Status

Only **Ticketmaster** is operational with the current credentials. All other adapters are either blocked or need additional API keys:

| Adapter | Status | Notes |
|---------|--------|-------|
| Ticketmaster | ✅ Active | `TICKETMASTER_API_KEY` set; Music + Sports classifications work reliably |
| Luma | ⚠️ Needs key | Requires `LUMA_API_KEY`; adapter code complete and correct; geo-radius search by lat/lng |
| EventbriteWeb | ❌ Blocked | HTTP 405 — Eventbrite blocks scraping as of 2026-08 |
| Meetup | ❌ Broken | GraphQL endpoint returns 404; API requires auth now |
| Bandsintown | ❌ Blocked | HTTP 403 — `app_id=1` default no longer accepted |
| Eventbrite API | ❌ No key | Requires `EVENTBRITE_TOKEN` |
| Songkick | ❌ No key | Requires `SONGKICK_API_KEY`; metro IDs set for all active cities |

Registry (`registry.ts`) wires adapters to categories — e.g. Tech runs StationAustin → EventbriteWeb → Luma → Meetup → Eventbrite → Ticketmaster in order. When only Ticketmaster responds, cities without Music or Sports may get few results.

When only Ticketmaster is available, cities without Music or Sports events that week may get few results. See the "Dev vs Production Generate Quality Gap" section for the workaround.

## Relevant Files

- `artifacts/api-server/src/routes/events.ts` — all digest endpoints; `filterStaleEvents()` and `digestToApi()`
- `artifacts/api-server/src/lib/dailyCleanup.ts` — nightly DB-level cleanup (unsent digests only)
- `artifacts/api-server/src/lib/emailService.ts` — email rendering and sending
- `artifacts/austin-events/src/pages/admin.tsx` — admin UI
- `artifacts/api-server/src/lib/eventSources/registry.ts` — adapter-to-category wiring
- `artifacts/api-server/src/lib/eventSources/ticketmaster.ts` — Ticketmaster adapter (TM_CLASSIFICATION)
- `artifacts/api-server/src/lib/weeklyRefresh.ts` — community events (COMMUNITY_EVENTS map)
