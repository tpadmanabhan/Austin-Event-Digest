---
name: Stale event filtering
description: Past events are now filtered at the API response layer in digestToApi(), not just by the nightly DB cleanup — covers sent digests too.
---

## Preview versus actual email inclusion

Verify event inclusion in public responses, the newsletter preview, and the actual send preparation—not just in the HTML renderer. Future-year and multi-day features must retain verified years and their final local day, without inventing session times.

**Why:** A next-year tournament rendered correctly in an email preview but separate caption-only filters treated it as a past event in the current year, hiding it from public pages and actual email preparation.

**How to apply:** Test next-year, final-day, and expired fixtures through the real filtering paths before publishing or sending. Keep page and send filtering consistent; featured status never exempts an expired event.

## Rule

Past events are stripped inside `filterStaleEvents()`, called from `digestToApi()` in `artifacts/api-server/src/routes/events.ts`. This applies to every `GET /digest/latest` and `GET /digest/list` response, for every city.

**Why:** The nightly `scheduleDailyCleanup()` in `dailyCleanup.ts` only cleaned **unsent** digests (`sentCount === 0`). Once a digest was sent, its stale events were never removed from the DB — Sacramento and other cities kept showing past events indefinitely.

**How to apply:** If a city is still showing old events after this fix is deployed, the digest response itself is filtered, so it should resolve on its own. If it doesn't, check:
1. Is the deployment current? (fix requires a publish)
2. Is the date string format parseable? (non-standard formats fall through as "keep")

## What is never removed

- `isBusinessSpotlight: true` — business spotlights (no event date)
- `isPost: true` — community posts (no event date)
- Events with unparseable date strings (safe default: keep)

## ⚠️ featured events are NOT exempt

`featured: true` ("Special Events") are tagged by `autoTagFutureEvents` when an event falls beyond the digest week's Saturday. They still have a date, and once that date passes they must be removed. Do NOT add `ev.featured` back to the "always keep" list — it caused old Sacramento events to persist indefinitely because all events in a sent digest get auto-tagged as featured when they're beyond the week end.

## Two-layer cleanup

| Layer | Where | Scope |
|-------|-------|-------|
| API response | `filterStaleEvents()` in `digestToApi()` | All digests, all cities, every request |
| Nightly job (2 AM) | `scheduleDailyCleanup()` in `dailyCleanup.ts` | Unsent digests only (`sentCount === 0`) |

## Client filtering and ongoing events

The public home and digest pages apply their own filter to event cards and map pins after the API response. For a multi-day or ongoing listing, keep it visible through the final calendar day in `event.timezone`; do not decide from the start date alone or the viewer's local timezone.

**Why:** Osaka's first edition initially hid active exhibitions and seasonal listings that had started before the edition window. A browser outside Japan can also cross the event's final-day boundary at a different time.

**How to apply:** When changing date filtering, check the home page, digest page, and map count with ongoing events, and verify both the first and final local event dates.
