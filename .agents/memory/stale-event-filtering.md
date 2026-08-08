---
name: Stale event filtering
description: Past events are now filtered at the API response layer in digestToApi(), not just by the nightly DB cleanup — covers sent digests too.
---

## Rule

Past events are stripped inside `filterStaleEvents()`, called from `digestToApi()` in `artifacts/api-server/src/routes/events.ts`. This applies to every `GET /digest/latest` and `GET /digest/list` response, for every city.

**Why:** The nightly `scheduleDailyCleanup()` in `dailyCleanup.ts` only cleaned **unsent** digests (`sentCount === 0`). Once a digest was sent, its stale events were never removed from the DB — Sacramento and other cities kept showing past events indefinitely.

**How to apply:** If a city is still showing old events after this fix is deployed, the digest response itself is filtered, so it should resolve on its own. If it doesn't, check:
1. Is the deployment current? (fix requires a publish)
2. Is the date string format parseable? (non-standard formats fall through as "keep")

## What is never removed

- `isBusinessSpotlight: true` — business spotlights
- `isPost: true` — community posts
- `featured: true` — Special Events / future-tagged events
- Events with unparseable date strings (safe default: keep)

## Two-layer cleanup

| Layer | Where | Scope |
|-------|-------|-------|
| API response | `filterStaleEvents()` in `digestToApi()` | All digests, all cities, every request |
| Nightly job (2 AM) | `scheduleDailyCleanup()` in `dailyCleanup.ts` | Unsent digests only (`sentCount === 0`) |
