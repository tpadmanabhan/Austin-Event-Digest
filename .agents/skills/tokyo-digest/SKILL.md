---
name: tokyo-digest
description: Handle Tokyo-specific digest workflows including Japanese translation, language toggle, and Tokyo admin auth. Use when generating, importing, or troubleshooting the Tokyo digest, or when working on Japanese language features.
---

# Tokyo Digest

Tokyo is the only city on the platform with a second language (Japanese). It has unique behaviors around translation, language persistence, and email content.

## Language System

- **Toggle:** Visitors can switch between English and Japanese via a language toggle in the header
- **Persistence:** Language selection is stored in `localStorage` as `ec-lang` (`"en"` | `"ja"`)
- **Scope:** The `ec-lang` key is global — a user who switches to Japanese on Tokyo will see Japanese if they visit another city that supports it. Only Tokyo renders Japanese-specific UI translations.
- **Strings:** Static Japanese UI strings live in `artifacts/austin-events/src/i18n/ja.ts`
- **Context:** `artifacts/austin-events/src/contexts/lang-context.tsx` and `language-context.tsx` both use `Lang = "en" | "ja"`

## Translation of Event Content

Event titles and descriptions are AI-translated (OpenAI) for Tokyo digests. Two mechanisms:

### 1. Translation Cache (DB-backed)
Translations are stored in the DB to avoid re-translating on every page load. The cache uses a `translations` table keyed by source text + language.

### 2. Pre-warm on Digest Import
When a digest is imported for Tokyo (`POST /api/events/digest/import`), event titles and descriptions are pre-translated in the background:

```ts
// artifacts/api-server/src/routes/events.ts
if (req.tenant!.slug === "tokyo") {   // ← slug-based check (not hardcoded ID)
  prewarmTranslationCache(taggedImportEvents).catch(() => {});
}
```

This fires-and-forgets so the import response is instant; translations are ready by first page load.

### 3. Frontend Translation
The digest page fetches translations for all visible events in a single batched call on load. Events not yet in the cache trigger an on-demand translation.

## Admin Auth for Tokyo

Tokyo's `password_hash` is **null in both dev and production**. Use the **email-based HMAC** pattern — NOT the password-hash pattern.

```js
// Production (tenant ID 8):
const token = crypto.createHmac("sha256", process.env.RSVP_HMAC_SECRET)
  .update("admin-email:8:aiimplementationclubaustin@gmail.com")
  .digest("hex");
// Use against https://tokyo.eventcarpooling.com/api/...

// Dev (tenant ID 4):
const token = crypto.createHmac("sha256", process.env.RSVP_HMAC_SECRET)
  .update("admin-email:4:aiimplementationclubaustin@gmail.com")
  .digest("hex");
```

> ⚠️ The `admin-api-auth` skill originally listed Tokyo as "Password-hash" — this is wrong. Tokyo was never assigned a password. Always use email-based auth.

## Generating a Tokyo Digest

Same flow as other cities, but run against `tokyo.eventcarpooling.com`:

```bash
curl -X POST "https://tokyo.eventcarpooling.com/api/events/digest/generate" \
  -H "Authorization: Bearer $TOKYO_TOKEN" \
  -d '{"weekStart":"2026-08-10"}'
```

After importing events, the translation pre-warm runs automatically. Allow 30–60 seconds before the first page load for translations to finish.

## Spotlight / Community Post Audit (Tokyo-specific)

Business spotlights (`isBusinessSpotlight: true`) and community posts (`isPost: true`) in the Tokyo digest can accumulate duplicates if `POST /api/events/digest/:id/spotlight` is called more than once, or if events are patched in manually alongside an existing spotlight.

**Check for duplicates before sending:**
```python
for i, e in enumerate(events):
    if e.get('isBusinessSpotlight') or e.get('isPost'):
        print(f"[{i}] {e.get('title')} | {e.get('link')}")
```

Watch for:
- Same `link` appearing twice with different titles (remove the duplicate by index)
- **Placeholder descriptions** — WordPress/Avada demo copy ("Create a cutting-edge website for cryptocurrency services with Avada…") means the description was never updated; replace with accurate copy
- **HTML entities in titles** — WordPress-sourced data often contains `&#8211;` (en-dash), `&#8217;` (apostrophe), etc. Decode with Python's `html.unescape()` before storing

## Known Issues / Watch Points

- **Language persistence is global** — if a user toggles to Japanese on Tokyo and then visits Austin, Austin may show partial Japanese UI if any key happens to have a Japanese variant. Only Tokyo has full Japanese translation coverage.
- **Translation cache** — `ANY(${array})` syntax is broken in Drizzle's `sql` template for this use case; the translation cache uses a workaround (single batched frontend call). Do not change the cache query pattern without verifying the fix still works.
- **Generating Tokyo digests falls back to Austin sample events** — Ticketmaster returns 0 results for Tokyo, Japan with the current adapter. `generateSampleDigest()` now generates a city-specific *intro* ("Hey Tokyo!") but the fallback *event list* still contains Austin venues (Barton Springs, ACL Live, etc.). Do NOT push these to production. Use the import endpoint with curated Tokyo events instead (Task #117 tracks the underlying fix).

## Relevant Files

- `artifacts/austin-events/src/i18n/ja.ts` — static Japanese UI strings
- `artifacts/austin-events/src/contexts/lang-context.tsx` — language context
- `artifacts/austin-events/src/contexts/language-context.tsx` — secondary language context
- `artifacts/api-server/src/routes/events.ts` — translation prewarm on import (search `slug === "tokyo"`)
- `artifacts/api-server/src/lib/translationCache.ts` — translation cache logic
