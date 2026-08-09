---
name: City branding bleed
description: Austin-specific copy ("Happy Sunday, Austin!", "Hey Austin! 🤠", "Now Live in Austin") leaked into all non-Austin city digest emails. Root causes, fixes, and audit pattern.
---

# City Branding Bleed

## The Problem
Non-Austin cities (Sacramento, Bulverde, Portland, Brushy Creek) were receiving email digests with:
- Intro text: "Happy Sunday, Austin! Here's your weekly roundup..."
- Subject emoji: 🤠 for all cities
- AustinCares promo block: "🏷️ Now Live **in Austin**" and "The best deal **in Austin**"

## Root Causes (All Fixed)

### 1. `generateSampleDigest()` — Austin-only fallback intro
`artifacts/api-server/src/lib/digestGenerator.ts` hardcoded "Happy Sunday, Austin!" in the fallback intro/subject. Used for ALL cities except St. Louis when adapters return events (the intro from this function is still used as `fallback.intro`).

**Fix:** `generateSampleDigest()` now accepts a third `tenant` param (`{ slug, city, digestTitle }`) and generates city-specific copy and emoji.

### 2. Gmail reader intro leak
`artifacts/api-server/src/lib/emailReader.ts` returns `intro: "Hey Austin! I combed through X newsletters 🤠"`. The generate endpoint in `events.ts` was using this `gmailIntro` as `introBase` for ALL cities when Gmail returned any events (which it does, since the inbox is shared).

**Fix:** In `events.ts` generate endpoint: `introBase = (slug === "austin" && gmailIntro) ? gmailIntro : fallback.intro` — Gmail intro now only applies to Austin.

### 3. AustinCares promo block
`emailService.ts` had "🏷️ Now Live in Austin" / "The best deal in Austin" in a promo block rendered for ALL cities except AustinCares.

**Fix:** Now reads "🏷️ New · Austin Cares / The best local deals, curated every week."

## Audit Pattern
Before sending any city's digest for the first time or after regeneration:
```sql
SELECT slug, d.id, LEFT(d.intro, 100)
FROM tenants t JOIN digests d ON d.tenant_id = t.id AND d.week_of = 'YYYY-MM-DD'
WHERE t.slug NOT IN ('austin');
```
If intro contains "Austin" → PATCH with `PATCH /api/events/digest/:id/intro`.

## How to Fix a Bad Intro on Production
```bash
curl -s -X PATCH "https://CITY.eventcarpooling.com/api/events/digest/ID/intro" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"intro":"Hey [City]! ..."}'
```

**Why:** Both the Gmail intro path and the `generateSampleDigest` fallback path produced Austin-specific text. The generate endpoint selected whichever was available without checking the tenant slug.

**How to apply:** Run the audit SQL above whenever generating a fresh digest for a non-Austin city, especially after code changes to the generate endpoint or digestGenerator.
