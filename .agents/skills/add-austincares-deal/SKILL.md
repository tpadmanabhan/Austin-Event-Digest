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

### Weekly deals digest (Aug 9–15 = digest 113)

AustinCares digest is populated manually each week with the 7 static deals from `STATIC_DEALS`, formatted as event-like objects. There is no auto-generate — always PATCH digest events directly.

**Populating deals:** Use `PATCH /api/events/digest/:id/events` with all 7 deals. Date each deal as **Saturday of the current week** (e.g. "Saturday, Aug 15 at 12:00 PM") so all deals stay visible throughout the week. `filterStaleEvents` removes entries whose date has passed — using the week's Saturday means deals don't disappear mid-week.

**Category:** Use `"Wellness"` (production workaround, until next deploy). Dev code (`applyTenantCategoryRestriction`) has no restriction, so any category passes on dev. After the next deploy, use `"Food & Markets"`.

**Intro:** Set a deals-focused intro by PATCHing `POST /api/events/digest/:id/intro`. Default auto-generated intros are Austin-events-flavored — always override for AustinCares.

**Subject:** PATCH via `POST /api/events/digest/:id/meta` with `{ "subject": "🏷️ Austin Cares Weekly Deals: Week of Aug X–Y, 202Z" }` to avoid the 🤠 cowboy emoji and "Events" fallback that the production generate endpoint still produces.

### Email theme (dev code — takes full effect after deploy)

| Element | Value |
|---------|-------|
| Header emoji | 🏷️ |
| Header title | `tenant.digestTitle` → "Austin Cares Weekly Deals" |
| Subtitle | "Your weekly guide to the best local deals in Austin" |
| Map heading | "Deal locations in Austin" |
| Events section | "This Week's Deals 🏷️" |
| Also Nearby copy | "These deals are a bit further out — but still worth the trip." |
| Deals CTA block | Teal bg + rust "See this week's deals →" → `/full` |
| Subscription email CTA | "Browse this week's deals →" |
| FROM name | "Austin Cares" (set via `PATCH /api/admin/settings` `name` field) |

> ⚠️ The header emoji, subtitle, and map heading require a **deploy** to take effect on production. All other items above are stored in the DB and work immediately.

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
- `artifacts/api-server/src/routes/events.ts` — `applyTenantCategoryRestriction` (empty in dev — no restriction for AustinCares; prod still enforces Wellness until deploy)
