---
name: Ticketmaster classification mapping
description: Only Music and Sports are reliable TM classificationName values; Arts & Theatre and Miscellaneous return 0 for many cities
---

# Ticketmaster Classification Mapping

## The rule
`TM_CLASSIFICATION` in `ticketmaster.ts` should only map **Music → "Music"** and **Sports → "Sports"**. All other categories (Arts, Tech, Wellness, Civics) must query Ticketmaster WITHOUT a classificationName so the broader event pool is returned, then `filterByTenantCategories()` handles local narrowing.

**Why:** Ticketmaster's segment names don't align with our internal category names. `Arts & Theatre` and `Miscellaneous` return 0 results for most cities even when events exist under "Music". St. Louis had 5–6 Music events for Aug 9–15 but got 0 under `Arts & Theatre` → fell through to sample fallback data.

**How to apply:**
- Do NOT add new entries to TM_CLASSIFICATION for categories other than Music and Sports.
- If a city generates with sample-only events (day-of-week dates, no source), check whether Ticketmaster is sending a bad classificationName.
- Workaround before deploy: generate on dev (fixed code), PATCH events to production digest.

## Symptom of the bug
Sample/fallback events have dates like `"Saturday at 8:00 AM"` (day-of-week only, no month/day). Real Ticketmaster events have `"Saturday, Aug 9 at 7:00 PM"`. If you see day-of-week-only dates in a production digest, the generate fell back to sample data.
