---
name: tenant-routing
description: Understand how the multi-tenant routing system works for eventcarpooling.com. Use when adding a new city, debugging tenant resolution, or working on per-city branding, email templates, or API routing.
---

# Tenant Routing

## How It Works

Every city runs on the same codebase but gets its own branded experience via subdomain. The **Host header** on every API request is used to look up the tenant in the `tenants` table via `artifacts/api-server/src/middleware/resolveTenant.ts`.

## City Reference (6 Standard Cities + Tokyo + AustinCares)

### 🤠 Austin (`austin.eventcarpooling.com`)
- **Auth:** Password-hash HMAC — **always fetch fresh hash from prod DB** before computing token; hash changes when password is updated; never reuse cached tokens
- **Curator:** Raj (customersuccessforgood.com)
- **Language:** English
- **Special features:** Subscriber radius/distance personalization, walkable-only filter, signed preferences token in emails, Nearest First sort
- **Layout:** Generic `home.tsx`; admin panel at `/admin`
- **Community events:** None defined — relies entirely on adapters

### 🌲 Sacramento (`sacramento.eventcarpooling.com`)
- **Auth:** Email-based HMAC (null passwordHash) — use `RSVP_HMAC_SECRET` + admin email
- **Curator:** Bob
- **Language:** English
- **Special features:** None beyond standard platform
- **Layout:** Generic `home.tsx`; Sacramento-specific intro/flag in home
- **Community events:** Public Library, Old Sac Waterfront Concert, Midtown Farmers Market, Urban Bee Festival, Sac Tech Meetup, Land Park Farmers Market

### 🌹 Portland (`portland.eventcarpooling.com`)
- **Auth:** Email-based HMAC (null passwordHash)
- **Curator:** *(blank — footer attribution won't render)*
- **Language:** English
- **Special features:** None beyond standard platform
- **Layout:** Generic `home.tsx`
- **Community events:** Community Gardens, Powell's Books, Saturday Market, PSU Farmers Market, Sunday Parkways, Tech Meetup, First Thursday Art Walk
- **⚠️ Ticketmaster geographic bleed:** TM city search for "Portland, OR" sometimes returns events for Portland, **Maine** (e.g. Portland Sea Dogs baseball). Always filter these before sending — look for venues clearly outside Oregon.

### ⚾ St. Louis (`stlouis.eventcarpooling.com`)
- **Auth:** Email-based HMAC (null passwordHash)
- **Curator:** Phil
- **Language:** English
- **Special features:** None beyond standard platform
- **Layout:** Generic `home.tsx`; St. Louis-specific greeting/flag
- **Community events:** Soulard Market, Gateway Arch, Art Museum, City Museum, STL Tech Meetup, Laumeier, Tower Grove
- **⚠️ Geocoding drift:** Vague venue strings like "Atomic Lounge, St. Louis" geocoded to Las Vegas; "Atomic Garage, St. Louis" geocoded to Des Moines. Always audit coords against the St. Louis bounding box (lat 37–40, lng -96 to -88) before sending. See "Geocoding Drift Audit" in the digest-workflow skill for the fix pattern.

### 🏞️ Brushy Creek (`brushycreek.eventcarpooling.com`)
- **Auth:** Email-based HMAC (null passwordHash) — see `brushycreek-admin-auth.md` in memory
- **Curator:** Rohan Vivier
- **Language:** English
- **Special features:** Uses BCRR-specific layout (variable named `isAustinCares` in `layout.tsx`/`home.tsx` checks `slug === "brushycreek"` — intentional naming, not a bug; renders BCRR Weekly Digest header and custom hero)
- **Layout:** Generic `home.tsx` but BCRR-styled via `isAustinCares` flag
- **Community events:** None defined — uses Austin metro Ticketmaster (Sports focus)

### 🌄 Bulverde (`bulverde.eventcarpooling.com`)
- **Auth:** Email-based HMAC (null passwordHash)
- **Curator:** *(blank)*
- **Language:** English
- **Special features:** None beyond standard platform; custom logo/layout ordering
- **Layout:** Generic `home.tsx`
- **Community events:** River Walk, Pearl Farmers Market, Bulverde Community Market, San Antonio Museum of Art, Comal County Civic Forum, Geekdom SA Tech Meetup, La Villita Night Market

### 🗼 Tokyo (`tokyo.eventcarpooling.com`) — See `tokyo-digest` skill
- **Auth:** Email-based HMAC (null passwordHash in both dev and prod) — prod ID 8, dev ID 4
- **Curator:** *(blank)*
- **Language:** English + Japanese (toggle available; Japanese strings in `i18n/ja.ts`)
- **Special features:** AI translation of event titles/descriptions on digest import (prewarm via slug check, not hardcoded ID); language toggle persists globally as `ec-lang`
- **Layout:** Generic `home.tsx` with Japanese-specific hero/category styling

### 🏛️ DC (`dc.eventcarpooling.com`)
- **Auth:** Email-based HMAC (null passwordHash)
- **Curator:** *(blank)*
- **Language:** English
- **Special features:** None beyond standard platform
- **Layout:** Generic `home.tsx`
- **Community events:** Eastern Market (Arts + Civics), Smithsonian (Arts), DC Tech Meetup (Tech), National Mall Morning Run (Wellness), Kennedy Center Millennium Stage (Arts)
- **⚠️ Geocoding drift:** "Washington" alone geocodes to Washington State — always use "Washington, DC" in venue strings. The Sage venue geocoded to WA state; The National Theatre geocoded to Africa on first pass. Always audit coords against DC metro bounds (lat 38.5–39.2, lng -77.5 to -76.7) before sending.

### 🌿 AustinCares (`austincares.eventcarpooling.com`)
- **Auth:** Password-hash HMAC — **always query prod DB for fresh hash**
- **Curator:** *(blank)*
- **Language:** English
- **Positioning:** **Weekly deals site**, not an events site. Primary value = the deals directory, not the digest.
- **Special features:** Dedicated pages — `/` → deals landing, `/full` → live deals map + directory + community submission form; digest email has a prominent "See this week's deals →" button to `/full`; category restriction removed in dev code (`applyTenantCategoryRestriction` RESTRICTIONS map is empty); until next deploy use `category: "Wellness"` on deal objects to pass prod validation
- **Layout:** `austin-cares-deals.tsx` and `austin-cares-full.tsx` (not generic `home.tsx`)

## Auth Quick Reference

| City | Auth Pattern | Notes |
|------|-------------|-------|
| Austin | Password-hash HMAC | Fetch fresh from prod DB every session |
| AustinCares | Password-hash HMAC | Fetch fresh from prod DB every session |
| Tokyo | Email-based HMAC | Null passwordHash; prod ID 8, dev ID 4 |
| Sacramento | Email-based HMAC | Null passwordHash |
| Portland | Email-based HMAC | Null passwordHash |
| St. Louis | Email-based HMAC | Null passwordHash |
| Brushy Creek | Email-based HMAC | Null passwordHash |
| Bulverde | Email-based HMAC | Null passwordHash |
| DC | Email-based HMAC | Null passwordHash; prod ID unknown until first deploy |

See `admin-api-auth` skill for token computation details and pre-computed production tokens.

## Health Check Bypass

`GET /api/healthz` and `GET /api` are registered **before** `app.use(resolveTenant)` in `app.ts` — health probes never trigger DB lookups.

## Per-City Email Intro

Digest intros are now city-specific — `generateSampleDigest()` accepts a tenant param and generates "Hey [City]!" copy with the correct emoji per city. The Gmail reader intro ("Hey Austin! 🤠") is gated to `slug === "austin"` only in the generate endpoint, so it no longer bleeds into Sacramento, Portland, etc.

Always audit stored intros before the first send for a new city:
```sql
SELECT slug, d.id, LEFT(d.intro, 100)
FROM tenants t JOIN digests d ON d.tenant_id = t.id
WHERE t.slug NOT IN ('austin') AND d.week_of = 'YYYY-MM-DD';
```
If any intro contains "Austin" → PATCH with `PATCH /api/events/digest/:id/intro`.

## Adding a New City

1. Add tenant seed to `startupMigration.ts` (idempotent `INSERT ... ON CONFLICT (slug) DO NOTHING`) — runs on next deploy
2. Register the subdomain in Replit Domains (user action in Replit UI)
3. Add a theme block for the new slug in `emailService.ts` (colors, emoji, curator name, cityGuideText) — otherwise it falls back to Austin's green/cowboy theme
4. Add city geo entries to `eventSources/utils.ts` CITY_GEO map (both bare and "City, ST" variants)
5. Add `slug/tz/tmCity` to `TENANT_CONFIGS` in `weeklyRefresh.ts`
6. Add community events to `COMMUNITY_EVENTS` in `weeklyRefresh.ts`
7. Add subject emoji to the `subjectEmoji` ternary in `digestGenerator.ts`
8. Add city bounding box to `CITY_BOUNDS` in `digest-workflow` skill for geocoding drift audit
9. Deploy → startupMigration seeds the tenant in production → generate digest, push events via API

## Relevant Files

- `artifacts/api-server/src/middleware/resolveTenant.ts` — slug extraction + DB lookup
- `artifacts/api-server/src/app.ts` — health check bypass before resolveTenant
- `artifacts/api-server/src/lib/emailService.ts` — per-city theme/branding (colors, curator, digest name)
- `artifacts/austin-events/src/components/layout.tsx` — per-city header/logo/tagline
- `artifacts/austin-events/src/App.tsx` — route definitions per tenant
- `artifacts/api-server/src/lib/weeklyRefresh.ts` — COMMUNITY_EVENTS map (curated recurring events per city)
