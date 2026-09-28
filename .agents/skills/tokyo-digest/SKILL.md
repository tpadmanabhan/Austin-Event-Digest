---
name: tokyo-digest
description: Handle Tokyo-specific digest workflows including Japanese translation, language toggle, and Tokyo admin auth. Use when generating, importing, or troubleshooting the Tokyo digest, or when working on Japanese language features.
---

# Tokyo Digest

Tokyo is the only city on the platform with a second language (Japanese). It has unique behaviors around translation, language persistence, and email content.

## Language System

- **Toggle:** Visitors can switch between English and Japanese via a language toggle in the header
- **Persistence:** Language selection is stored in `localStorage` as `ec-lang` (`"en"` | `"ja"`)
- **Scope:** Browser `localStorage` is origin-scoped, so this preference is not shared automatically between Tokyo and other city subdomains. The toggle and Tokyo-specific translations are gated by the tenant slug.
- **Strings:** Static Japanese UI strings live in `artifacts/austin-events/src/i18n/ja.ts`
- **Contexts:** `language-context.tsx` is the tenant-site language/translation context; it persists `ec-lang` and calls `/api/translate`. `lang-context.tsx` is a separate platform-home context; it only toggles local in-memory UI state and does not read or persist `ec-lang`. Do not treat these providers as interchangeable.

## Translation of Event Content

Event titles and descriptions are AI-translated (OpenAI) for Tokyo digests. Two mechanisms:

### 1. Translation Cache (DB-backed)
Translations are stored in the `translation_cache` table, keyed by source text + target language, to avoid re-translating cached strings.

### 2. Pre-warm on Digest Import
When a digest is imported for Tokyo (`POST /api/events/digest/import`), event titles and descriptions are pre-translated in the background:

```ts
// artifacts/api-server/src/routes/events.ts
if (req.tenant!.slug === "tokyo") {   // ← slug-based check (not hardcoded ID)
  prewarmTranslationCache(taggedImportEvents).catch(() => {});
}
```

This runs fire-and-forget after the import response, so it is best-effort and is not guaranteed to finish before the first page load. The frontend can still request uncached translations on demand.

### 3. Frontend Translation
The Tokyo home page batches event titles and descriptions into one `/api/translate` request while Japanese is selected. The route checks the DB cache, translates cache misses, and returns original text if translation is unavailable or incomplete. The SQL cache lookup uses individual parameterized queries in parallel; do not replace it with an unverified array-parameter query pattern.

## Admin Auth for Tokyo

Tokyo uses the email-based admin HMAC path in the shared `requireAdmin` middleware (the middleware can also validate password-hash tokens for tenants that use them). Use `admin-api-auth` to obtain a tenant- and environment-correct token. Do not hardcode tenant IDs/admin emails from an example, copy tokens between environments, or print `RSVP_HMAC_SECRET` or derived tokens.

## Generating a Tokyo Digest

Use the normal authenticated digest generate/import flow against the Tokyo tenant, with the exact request fields documented by the API/admin UI. `POST /api/events/digest/import` requires `weekOf`, `subject`, `intro`, and a non-empty `events` array. It applies tenant/content filtering, inserts a new digest, then starts geocoding and Japanese translation pre-warming in the background.

If event discovery returns no usable Tokyo events, the current generate route creates an empty draft for non-Austin tenants rather than inserting Austin sample events. Do not send an empty or unverified draft as a finished Tokyo edition; import or curate real Tokyo listings and confirm dates, venue, links, and event count. Generation may carry forward future featured events from the previous digest for the same tenant, so audit those for continued validity and location before sending.

## Spotlight / Community Post Audit (Tokyo-specific)

Business spotlights (`isBusinessSpotlight: true`) and community posts (`isPost: true`) in the Tokyo digest can accumulate duplicates if `POST /api/events/digest/:id/spotlight` is called more than once, or if events are patched in manually alongside an existing spotlight.

Before adding or sending, inspect all entries marked `isBusinessSpotlight` or `isPost` and compare normalized titles and links. The spotlight route appends a new item; it does not upsert or deduplicate existing entries. Treat its use as a mutation, and preserve unrelated events when correcting a duplicate. Do not assume a single-item delete route exists; inspect the current admin API/UI before attempting removal.

Watch for:
- Same `link` appearing twice with different titles; resolve through a reviewed full-list update rather than assuming an index-delete API exists
- **Placeholder descriptions** — WordPress/Avada demo copy ("Create a cutting-edge website for cryptocurrency services with Avada…") means the description was never updated; replace with accurate copy
- **HTML entities in titles** — WordPress-sourced data may contain encoded punctuation such as `&#8211;` or `&#8217;`; normalize to readable text before storing and avoid double-encoding

## Japanese Translation Coverage

On the Tokyo home page, dynamic event titles and descriptions are batched for regular events, featured events, business spotlights, and community posts. Static UI translations (hero, section labels, category filters, event actions and empty states) live in `ja.ts`. When changing the page, verify both paths: dynamic copy through `translateEvent()`/`/api/translate`, and fixed labels through `JA`/`jt()`. Translation is Tokyo-gated even though the shared tenant page and language context are used by other cities.

## Duplicate Spotlight / Post Dedup

Do not apply an in-memory deduplication snippet and assume it updates the stored digest. Audit by title and link, then make a reviewed admin update that preserves all other entries; `PATCH /api/events/digest/:id/events` replaces the whole non-empty event array.

## Known Issues / Watch Points

- **No-result generation is an empty draft for Tokyo** — the current generate route intentionally uses Austin sample fallback only for Austin/St. Louis. Curate/import real Tokyo listings if discovery yields none.
- **Carry-forward is tenant-scoped, but still audit content** — generation reads featured events from the latest digest for that tenant. Remove or correct expired, mislocated, or otherwise stale carry-forwards through a reviewed whole-array update.
- **Translation pre-warm is asynchronous** — do not rely on a fixed wait time. The frontend on-demand translation path remains available for uncached text.

## Relevant Files

- `artifacts/austin-events/src/i18n/ja.ts` — static Japanese UI strings (includes spotlight labels)
- `artifacts/austin-events/src/pages/home.tsx` — `translateEvent()` calls for all card types
- `artifacts/austin-events/src/contexts/lang-context.tsx` — language context
- `artifacts/austin-events/src/contexts/language-context.tsx` — secondary language context
- `artifacts/api-server/src/routes/events.ts` — Tokyo digest import and email translation flow
- `artifacts/api-server/src/routes/translate.ts` — translation API and DB-cache reads/writes
- `artifacts/api-server/src/lib/translationPrewarm.ts` — background cache pre-warm after import
