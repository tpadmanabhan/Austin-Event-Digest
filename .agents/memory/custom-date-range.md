---
name: Custom date range digests
description: How to generate a digest covering more or fewer than 7 days, and push to production
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
