---
name: add-austincares-deal
description: Add a new deal to the AustinCares deals page and map. Use when the user wants to add, update, or remove a business deal on austincares.eventcarpooling.com — either as a static (curated) entry or a community submission.
---

# AustinCares — Full Reference

AustinCares is a standalone tenant on `austincares.eventcarpooling.com` focused on affordability deals and community events. It has two pages, a deals API, and a digest restricted to Civics/Wellness events.

---

## Page Routes

| URL | Component | Purpose |
|-----|-----------|---------|
| `/` | `austin-cares-deals.tsx` | Marketing landing — sample map, day strip, business pitch, CTAs to `/full` |
| `/full` | `austin-cares-full.tsx` | Live deals map + directory, community submission form |
| `/admin` | `AdminLoginGate` | Standard admin panel (same as other cities) |
| `/digest/:id` | Digest | Standard digest page |

The landing page (`/`) shows a **sample preview** of real deals (top 3 from STATIC_DEALS: Spokesman Coffee, Masala Wok, Rasoi). The full live directory with all deals and the community submission form is on `/full`.

---

## Admin Auth

AustinCares uses **password-hash HMAC** (same as Austin and Tokyo). Dev and prod hashes differ — always query the target DB:

```js
// Production token:
const r = await executeSql({
  sqlQuery: "SELECT password_hash FROM tenants WHERE slug = 'austincares'",
  environment: "production"
});
// token = HMAC(passwordHash, "admin-session")
```

See `admin-api-auth` skill for the full token computation pattern.

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
  source: "Direct" | "Groupon" | "Community",
  location: string,       // human-readable address
  url?: string,
  imageUrl?: string,      // "/api/storage/objects/uploads/<uuid>"
  lat: number,            // required for map pin
  lng: number,            // required for map pin
  isSubmitted?: boolean,  // true = teal "🌱 Community" badge
}
```

**Always include `lat` and `lng`** — deals without coordinates are silently excluded from the map.

#### Current Static Deals (all 7)

| Day | Business | Deal | Savings | Source | lat | lng |
|-----|----------|------|---------|--------|-----|-----|
| MON | Spokesman Coffee | Free drip coffee with any pastry purchase | Free drip | Direct | 30.3330 | -97.7388 |
| TUE | Masala Wok | Tikka Tuesday — Tikka Masala + Rice + Naan + Drink | $11.95 all-day | Direct | 30.4161 | -97.7354 |
| TUE | Sangam Chettinad | Authentic Chettinad cuisine — weekly specials | See location for details | Community | 30.5273 | -97.6267 |
| ANY DAY | Schlotzsky's | $25 eGift Card Toward Sandwiches, Salads, Pizzas, Soups & Desserts | Pay $22.62 · Save $2.38 | Groupon | 30.1762 | -97.7834 |
| ANY DAY | McAlister's Deli | $25 eGift Card Toward Sandwiches, Salads, Spuds, Desserts & Drinks | Pay $22.62 · Save $2.38 | Groupon | 30.3617 | -97.7307 |
| ANY DAY | Rasoi Indian Restaurant | $25 Toward Food & Drinks — up to 22% off | From $13.50 | Groupon | 30.4350 | -97.7900 |
| ANY DAY | Electric Gravy Mumbai Bar & Canteen | Indian Cuisine Food & Drinks | From $19 | Groupon | 30.2693 | -97.7266 |

#### 2. Community Submitted Deals
Stored in `submitted_deals` table. Submitted via the form on `/full` or `POST /api/deals/submit`.

**DB columns:** `id`, `business_name`, `deal_description`, `location_address`, `contact_name`, `contact_email`, `savings`, `day_of_week`, `photo_url`, `lat`, `lng`, `created_at`

On every API server restart, `startupMigration.ts` geocodes up to 50 submitted deals with null `lat`/`lng` via Nominatim (suite-stripped retry). If a pin is missing, restart the API server or patch lat/lng directly in the DB.

---

## API Routes

All in `artifacts/api-server/src/routes/deals.ts`:

| Method | Route | Auth | What it does |
|--------|-------|------|-------------|
| `GET` | `/deals/submitted` | None | Returns public-safe fields from `submitted_deals` (excludes submitter name/email), oldest first |
| `POST` | `/deals/submit` | None | Validates fields, downloads+validates image from object storage, calls OpenAI vision to extract business/deal/savings/day, geocodes address, inserts into DB |

**Note:** Neither route requires auth. The submission endpoint collects private submitter info (name, email) but stores it server-side only — never returned in GET.

---

## Digest Behavior

AustinCares digests are **restricted to Civics and Wellness categories only** — enforced in `applyTenantCategoryRestriction()` in `events.ts`. All other event categories are filtered out at ingest time.

**Email theme:** Teal gradient (`#0a2e2e → #134040 → #1e6e6e`), primary `#1e6e6e`, emoji 🌱, guide text "Your weekly guide to community events and causes in Austin".

**Known issue:** Austin Cares digest currently has 0 events (Task #95).

---

## Platform Home Section

A "AustinCares Daily Deals" section lives in `artifacts/austin-events/src/pages/platform-home.tsx` (~line 446). It has:
- "Now Live" badge, affordability headline
- Deal sample cards (Spokesman Coffee MON, Sangam Chettinad TUE, Masala Wok WED) — **these are hardcoded mockup data**, not pulled live
- CTAs: "Browse today's deals →" → `https://austincares.eventcarpooling.com`, "Add your deal" → `/full`

**Note:** The platform-home mockup shows different day assignments and offers than what's actually in STATIC_DEALS. They don't need to match exactly (it's a visual preview), but keep them roughly current if static deals change significantly.

---

## Canonical Copy

Key UI strings — do not revert these:

| Location | Element | Text |
|----------|---------|------|
| Landing page (`/`) hero button | Primary CTA | "Get Weekly Deals" |
| Landing page (`/`) nav + hero | Secondary CTA | "I run a business →" |
| Full page (`/full`) header `<h1>` | Page title | "Weekly Deals" |
| Full page (`/full`) header sub-label | Eyebrow | "AustinCares · Full Edition" |

The full page header has **no date line** — the week date reference was intentionally removed.

---

## Known Inconsistencies / Watch Points

- **Sangam Chettinad** still has a placeholder deal description ("Authentic Chettinad cuisine — weekly specials") — open.
- **Platform home mockup** (`platform-home.tsx` ~line 446) has hardcoded sample deal cards. Update it alongside STATIC_DEALS when deals change significantly so they stay roughly in sync.
- **Landing page sample digest** (`austin-cares-deals.tsx`) also has hardcoded deal rows (not pulled from STATIC_DEALS). Update both files together when static deals change.
- **Testimonial quote** on the landing page is still a placeholder — "swap in a real review once live" note is in the component.

---

## Relevant Files

- `artifacts/austin-events/src/pages/austin-cares-full.tsx` — STATIC_DEALS, map, deal cards, submission form
- `artifacts/austin-events/src/pages/austin-cares-deals.tsx` — marketing landing page
- `artifacts/austin-events/src/pages/platform-home.tsx` — AustinCares section on main landing (~line 446)
- `artifacts/api-server/src/routes/deals.ts` — GET + POST deals API
- `artifacts/api-server/src/lib/startupMigration.ts` — geocode backfill for submitted deals
- `artifacts/austin-events/src/App.tsx` — route definitions for austincares (lines 46–47)
- `artifacts/api-server/src/lib/emailService.ts` — AustinCares email theme (~line 501)
- `artifacts/api-server/src/routes/events.ts` — `applyTenantCategoryRestriction` (Civics + Wellness only)
