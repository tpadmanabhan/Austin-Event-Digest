---
name: Custom date range digests
description: How to generate a digest covering more or fewer than 7 days, audit coverage, and push to production
---

## Generate endpoint: weekEnd parameter
- `POST /api/events/digest/generate` accepts optional `weekEnd` (ISO date string) alongside `weekOf`
- This field is NOT in the Zod `GenerateDigestBody` schema — it's read directly from `req.body` after schema parse
- When `weekEnd` is supplied, `fetchEventsFromGmail` uses `eventFallsInRange(start, end)` instead of `eventFallsInWeek`
- Subject auto-generated as `🤠 Austin Events: June 11–June 20, 2026` (inclusive end = weekEnd - 1 day)
- Event cap raised to 25 (was 8)

## Production push workflow
1. Generate digest in dev: `POST localhost:80/api/events/digest/generate {weekOf, weekEnd}`
2. Fetch full digest: `GET localhost:80/api/events/digest/list` → find by id
3. Clean up: remove near-duplicates (same event from multiple sources), fix venue strings post-hoc
4. Push to prod: `POST https://eventcarpooling.com/api/events/digest/import {weekOf, subject, intro, events}`
   - The import endpoint bypasses all parsing and inserts directly into production DB

## Post-hoc cleanup for What's Weird ATX venues (pre-fix)
If time contains " @ venue", extract venue from date field:
```js
const atIdx = e.date.indexOf(' @ ');
if (atIdx !== -1) {
  venue = e.date.slice(atIdx + 3).split(/,\s*\$\d+/)[0].split(/\s*\(through/)[0].trim();
  date = e.date.slice(0, atIdx);
}
```

**Why:** Production and dev DBs are separate; dev is used for test generation; only push via import when the result is verified clean. Doing cleanup in a node script before the import call is faster than regenerating multiple times.

## Required post-generation audit
Custom-range generation can include events from the previous local calendar day because source timestamps cross UTC boundaries. Broad Ticketmaster results can also collapse unrelated categories into Arts, leaving Tech or Civics unrepresented.

**Why:** A custom Austin generation included events from the day before its requested start and produced an overwhelmingly Arts-heavy list despite all five tenant categories being configured.

**How to apply:** Before keeping a custom-range digest, remove out-of-range events, validate stated weekdays against numerical dates, deduplicate titles, and confirm intentional representation of every configured category.

Longer editions can also fill the generation cap on the first few busy days, leaving later requested dates empty even though matching events exist.

**Why:** A ten-day city edition initially returned only events from the first few days despite live events later in the requested range.

**How to apply:** Audit every date in the requested span, not just the total count; curate verified later events rather than assuming generation covers the entire range.
