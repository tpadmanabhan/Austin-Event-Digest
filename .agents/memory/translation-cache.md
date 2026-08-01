---
name: Tokyo translation cache
description: How the server-side translation cache works, why it was needed, and the pitfalls to avoid
---

## The rule
`translation_cache` table (source_text, target_lang, translated_text) stores all OpenAI translations so repeat page loads are instant instead of 50–80s.

## Why it was needed
`gpt-5-nano` through the AI integrations proxy takes 35–80 seconds per call in production. Two concurrent calls (old pattern: one for titles, one for descriptions) caused one to fail silently and return originals. The fix: single batched call (titles + descs concatenated) + server-side DB cache.

## How to apply
- `translate.ts` checks DB cache first (parallel point queries per text — `ANY(${array})` does NOT work in drizzle sql template); only calls OpenAI for uncached texts; stores results back.
- `home.tsx` / `digest.tsx` send `translate([...titles, ...descs])` in one call, then split at `titles.length`.
- `translationPrewarm.ts` is called fire-and-forget after Tokyo digest import to pre-warm the cache.
- Cache is keyed on exact source text — if an event's title or description is edited, the old cache entry stays until explicitly deleted.

## Critical gotcha
`ANY(${texts})` in drizzle's `sql` template tag does NOT expand a JS array correctly into a PostgreSQL array parameter. Use individual `WHERE source_text = ${text}` queries run in `Promise.all` instead.

## Tokyo production state
All 8 current Tokyo events (digest #99, Aug 2–8 2026) are pre-warmed in production translation_cache for target_lang='ja'. All 8 venues have hardcoded lat/lng coordinates.
