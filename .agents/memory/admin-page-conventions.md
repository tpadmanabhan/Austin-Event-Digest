---
name: Admin page conventions
description: Required UX patterns for all current and future admin pages — must be preserved and extended consistently.
---

# Admin Page Conventions

These are permanent requirements for the admin panel (`artifacts/austin-events/src/pages/admin.tsx`). Both Austin and AustinCares share the same component — changes automatically apply to both tenants.

## 1. localStorage persistence (Save buttons)

Every section with user-entered URLs or content must have a **Save** button that persists to `localStorage` under a tenant-scoped key (`admin_<section>_${tenant.slug}`). Data is loaded back on mount via `useEffect([tenant.slug])`.

Current persisted sections:
- **Source URLs** — `admin_source_urls_${slug}` — array of 5 URL strings
- **Business spotlight** — `admin_biz_${slug}` — `{ url, title, desc }`
- **Community spotlight** — `admin_comm_${slug}` — `{ url, title, desc, deadline }`

**Why:** Admins re-enter the same URLs every week. Save buttons eliminate that friction.

**How to apply:** Any new admin section with repeating inputs must include a `BookmarkCheck` Save button and a matching load effect.

## 2. Spotlight digest picker defaults to "Create new digest"

Both Business and Community Spotlight pickers default to `null` (empty string value in `<select>`), labeled **"— Create new digest —"**. When the admin clicks Add Spotlight with `null` selected, the frontend automatically calls `POST /api/events/digest/create-empty` (with `weekOf = currentSunday`) to create a fresh digest, then adds the spotlight to it.

**Why:** Admins shouldn't need to pre-generate a digest before adding spotlights for the upcoming week.

**How to apply:** Any new picker that targets a digest must include this default option and the auto-create logic in `onAddSpotlight`.

## 3. Send Draft card has a week picker

The "Send Draft" quick-action card (sidebar) includes a `<select>` dropdown listing all digests (most recent first, ordered by `weekOf DESC`). It defaults to the most recent digest via a `useEffect` that fires once when `digestsData` loads. The user can change the selection to any week.

**Why:** The "latest" digest may be from a prior week. Admins need to be able to pick the current week's digest explicitly.

**How to apply:** Never hardcode `digests[0]` for send actions. Always expose a picker.

## 4. API endpoint: create-empty

`POST /api/events/digest/create-empty` (admin-only) creates a digest with 0 events for a given `weekOf` (defaults to next Sunday). Used by the spotlight auto-create flow.

## 5. Tenant isolation

All localStorage keys are scoped with `${tenant.slug}` so Austin and AustinCares never share saved data, even if accessed from the same browser.
