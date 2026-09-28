---
name: add-austincares-deal
description: Add a new deal to the AustinCares deals page and map. Use when the user wants to add, update, or remove a business deal on austincares.eventcarpooling.com — either as a static (curated) entry or a community submission.
---

# AustinCares — Full Reference

AustinCares is a standalone tenant on `austincares.eventcarpooling.com` — a **weekly deals site**, not an events site. It has two pages, a deals API, and a digest email that links subscribers to the full deals directory. The digest is populated with weekly deals (formatted as event-like objects), not city events.

---

## Page Routes

| URL | Component | Purpose |
|-----|-----------|---------|
| `/` | `austin-cares-deals.tsx` | Marketing landing — sample map, day strip, business pitch, CTAs to `/full` |
| `/full` | `austin-cares-full.tsx` | Live deals map + directory, community submission form |
| `/admin` | `AdminLoginGate` | Standard admin panel (same as other cities) |
| `/digest/:id` | Digest | Standard digest page |

The landing page (`/`) shows a **sample preview**; the full live directory with current deals and the community submission form is on `/full`.

---

## Admin Auth

AustinCares uses **password-hash HMAC** (same as Austin, not Tokyo's email-based pattern). The shared `requireAdmin` middleware supports both password-hash and email-based patterns. Use the `admin-api-auth` skill for the correct target-environment workflow; do not assume tokens are interchangeable between environments, or print credentials/tokens.

---

## Deals System

### Two types of deals

#### 1. Static (Curated) Deals
Hardcoded in `STATIC_DEALS` array at the top of `artifacts/austin-events/src/pages/austin-cares-full.tsx` (~line 37). Always appear regardless of DB state. Static entries **win** on deduplication — if a submitted deal has the same business name (case-insensitive), it is suppressed.

**Shape:**
```ts
{
  day: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN" | "ANY DAY" | "WEEKLY",
  business: string,
  deal: string,
  savings: string,
  source: string,          // attribution shown on the deal card
  location: string,       // human-readable address
  url?: string,
  imageUrl?: string,      // absolute URL or same-origin path; page cards accept paths such as /api/storage/objects/uploads/<uuid>
  lat?: number,           // include accurate coordinates for a map pin
  lng?: number,
  isSubmitted?: boolean,  // true = community-submitted badge
  verifiedAt?: string,   // optional ISO date for the freshness badge
}
```

Include accurate coordinates whenever possible; entries without them cannot appear as map pins. Check the live `STATIC_DEALS` array before editing rather than relying on a saved list of current offers.

#### 2. Community Submitted Deals
Stored in `submitted_deals` table. Submitted via the form on `/full` or `POST /api/deals/submit`.

**DB columns:** `id`, `business`, `deal`, `savings`, `day`, `location_name`, `location_address`, `image_url`, `lat`, `lng`, `submitter_name`, `submitter_email`, `expires_at`, `status`, `created_at`.

> ⚠️ The column names above are the actual SQL names. Earlier skill versions listed incorrect aliases (`business_name`, `deal_description`, `day_of_week`, etc.) — those are wrong.

At API startup, `startupMigration.ts` attempts to backfill coordinates for up to 50 rows missing `lat`/`lng` via Nominatim, retrying after stripping suite/building qualifiers. This is a best-effort backfill, not a guarantee; avoid restarting production or editing the DB as a routine fix.

---

## API Routes

Deal routes are in `artifacts/api-server/src/routes/deals.ts`; community-deal moderation routes are in `artifacts/api-server/src/routes/admin.ts`. The API server mounts these under `/api`:

| Method | Route | Auth | What it does |
|--------|-------|------|-------------|
| `GET` | `/api/deals/submitted` | None | Returns public-safe fields (no submitter name/email) for non-expired rows; current query does not filter by `status` |
| `POST` | `/api/deals/submit` | None | Validates fields, downloads+validates image from object storage, calls OpenAI vision to extract business/deal/savings/day, geocodes address, inserts into DB with `status = 'approved'` |
| `PATCH` | `/api/admin/deals/:id` | Admin Bearer | Updates any combination of `business`, `deal`, `savings`, `day`, `locationName`, `locationAddress` on a submitted deal. Body: `{ business?, deal?, savings?, day?, locationName?, locationAddress? }`. Use to fix typos in live community deals. |
| `GET` | `/api/admin/deals/pending` | Admin Bearer, AustinCares only | Intended to list pending community deals |
| `POST` | `/api/admin/deals/:id/approve` | Admin Bearer, AustinCares only | Intended to approve a submitted deal |
| `POST` | `/api/admin/deals/:id/dismiss` | Admin Bearer, AustinCares only | Intended to dismiss a submitted deal |

The route implementation currently needs careful review before relying on moderation: `POST /deals/submit` inserts `status = 'approved'`, while `GET /deals/submitted` does not filter by status. The moderation handlers in `routes/admin.ts` also contain `DELETE` statements despite comments promising a list/approve operation (and the pending handler references an undeclared `id`). Do not call the moderation endpoints as if they were safe or functional until those handlers are corrected and tested. Public submission is unauthenticated and a submitted deal is immediately inserted as approved; verify its content before treating it as curated. The edit endpoint requires an admin Bearer token (see `admin-api-auth`).

---

## Digest Behavior

### Weekly deals digest

Weekly deals are stored as event-shaped items in the normal digest. Generic source generation is not a substitute for verifying current offers. Curate/import genuine deals, preserve the full event list when replacing it, and use the admin endpoints:

- `PATCH /api/events/digest/:id/events` with `{ "events": [...] }` replaces the entire non-empty list; it is not an append. Keep other valid entries.
- `PATCH /api/events/digest/:id/intro` with `{ "intro": "..." }` updates the intro.
- `PATCH /api/events/digest/:id/meta` with `{ "subject": "...", "weekOf": "..." }` updates metadata. Use a deals-specific subject rather than relying on generated fallback copy.

Past-dated regular items are filtered from digest responses and email sends. Use real validity dates; do not assign an artificial date solely to keep an offer visible. Items without a parseable date may remain visible, so still verify that offers are current before sending.

The email theme is tenant-aware in `emailService.ts` (AustinCares uses its deals branding, title and CTA). Check that code for current rendered copy; sender display name is selected from tenant data by the digest send route, not by changing an unrelated global setting.

---

## Platform Home Section

The platform home and landing page include hardcoded promotional previews. They are not the live directory; review those separately when changing the curated deals shown to visitors.

---

## Canonical Copy

Key UI strings — do not revert these:

| Location | Element | Text |
|----------|---------|------|
| Landing page (`/`) hero | Primary CTA button | "Get Weekly Deals" → `scrollToSubscribe` |
| Landing page (`/`) hero | Secondary CTA link | "See this week's deals →" → `/full` (dark filled, `<a>` tag) |
| Landing page (`/`) hero + nav | Tertiary CTA button | "I run a business →" → opens biz modal |
| Full page (`/full`) header `<h1>` | Page title | "Weekly Deals" |
| Full page (`/full`) header sub-label | Eyebrow | "AustinCares · Full Edition" |

The full page header has **no date line** — the week date reference was intentionally removed.

---

## Known Inconsistencies / Watch Points

- Verify offer terms, source links, expiry and coordinates when curating; do not assume hardcoded deals remain current.
- The pending/approve/dismiss community-deal handlers are unsafe/inconsistent with their comments (see API note above); inspect and test their implementation before using them.
- Landing-page and platform-home deal previews are hardcoded and may not match the live `/full` directory.

---

## Relevant Files

- `artifacts/austin-events/src/pages/austin-cares-full.tsx` — STATIC_DEALS, map, deal cards, submission form
- `artifacts/austin-events/src/pages/austin-cares-deals.tsx` — marketing landing page
- `artifacts/austin-events/src/pages/platform-home.tsx` — AustinCares section on main landing
- `artifacts/api-server/src/routes/deals.ts` — GET + POST deals API
- `artifacts/api-server/src/lib/startupMigration.ts` — geocode backfill for submitted deals
- `artifacts/austin-events/src/App.tsx` — route definitions for austincares (lines 46–47)
- `artifacts/api-server/src/lib/emailService.ts` — tenant-aware AustinCares digest email theme
- `artifacts/api-server/src/routes/events.ts` — digest category restrictions and event/digest admin routes
