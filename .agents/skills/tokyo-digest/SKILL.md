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

Tokyo uses **password-hash HMAC** (same as Austin). Dev and production databases have different passwordHashes — always query the target DB:

```js
// Production:
const result = await executeSql({
  sqlQuery: "SELECT password_hash FROM tenants WHERE slug = 'tokyo'",
  environment: "production"
});
// Then: HMAC(passwordHash, "admin-session")
```

## Generating a Tokyo Digest

Same flow as other cities, but run against `tokyo.eventcarpooling.com`:

```bash
curl -X POST "https://tokyo.eventcarpooling.com/api/events/digest/generate" \
  -H "Authorization: Bearer $TOKYO_TOKEN" \
  -d '{"weekStart":"2026-08-10"}'
```

After importing events, the translation pre-warm runs automatically. Allow 30–60 seconds before the first page load for translations to finish.

## Known Issues / Watch Points

- **Language persistence is global** — if a user toggles to Japanese on Tokyo and then visits Austin, Austin may show partial Japanese UI if any key happens to have a Japanese variant. Only Tokyo has full Japanese translation coverage.
- **Translation cache** — `ANY(${array})` syntax is broken in Drizzle's `sql` template for this use case; the translation cache uses a workaround (single batched frontend call). Do not change the cache query pattern without verifying the fix still works.

## Relevant Files

- `artifacts/austin-events/src/i18n/ja.ts` — static Japanese UI strings
- `artifacts/austin-events/src/contexts/lang-context.tsx` — language context
- `artifacts/austin-events/src/contexts/language-context.tsx` — secondary language context
- `artifacts/api-server/src/routes/events.ts` — translation prewarm on import (search `slug === "tokyo"`)
- `artifacts/api-server/src/lib/translationCache.ts` — translation cache logic
