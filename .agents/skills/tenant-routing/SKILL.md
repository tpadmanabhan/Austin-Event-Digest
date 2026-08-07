---
name: tenant-routing
description: Understand how the multi-tenant routing system works for eventcarpooling.com. Use when adding a new city, debugging tenant resolution, or working on per-city branding, email templates, or API routing.
---

# Tenant Routing

## How It Works

Every city runs on the same codebase but gets its own branded experience via subdomain. The **Host header** on every API request is used to look up the tenant in the `tenants` table via `artifacts/api-server/src/middleware/resolveTenant.ts`.

## City Reference (6 Standard Cities + Tokyo + AustinCares)

### 🤠 Austin (`austin.eventcarpooling.com`)
- **Auth:** Password-hash HMAC (has passwordHash) — dev and prod hashes differ, always query target DB
- **Curator:** Raj (customersuccessforgood.com)
- **Language:** English
- **Special features:** Subscriber radius/distance personalization, walkable-only filter, signed preferences token in emails, Nearest First sort
- **Layout:** Generic `home.tsx`; admin panel at `/admin`

### 🌲 Sacramento (`sacramento.eventcarpooling.com`)
- **Auth:** Email-based HMAC (null passwordHash) — use `RSVP_HMAC_SECRET` + admin email
- **Curator:** Bob
- **Language:** English
- **Special features:** None beyond standard platform
- **Layout:** Generic `home.tsx`; Sacramento-specific intro/flag in home

### 🌹 Portland (`portland.eventcarpooling.com`)
- **Auth:** Email-based HMAC (null passwordHash)
- **Curator:** *(blank — footer attribution won't render)*
- **Language:** English
- **Special features:** None beyond standard platform
- **Layout:** Generic `home.tsx`

### ⚾ St. Louis (`stlouis.eventcarpooling.com`)
- **Auth:** Email-based HMAC (null passwordHash)
- **Curator:** Phil
- **Language:** English
- **Special features:** None beyond standard platform
- **Layout:** Generic `home.tsx`; St. Louis-specific greeting/flag

### 🏞️ Brushy Creek (`brushycreek.eventcarpooling.com`)
- **Auth:** Email-based HMAC (null passwordHash) — see `brushycreek-admin-auth.md` in memory
- **Curator:** Rohan Vivier
- **Language:** English
- **Special features:** Uses BCRR-specific layout (variable named `isAustinCares` in `layout.tsx`/`home.tsx` checks `slug === "brushycreek"` — intentional naming, not a bug; renders BCRR Weekly Digest header and custom hero)
- **Layout:** Generic `home.tsx` but BCRR-styled via `isAustinCares` flag

### 🌄 Bulverde (`bulverde.eventcarpooling.com`)
- **Auth:** Email-based HMAC (null passwordHash)
- **Curator:** *(blank)*
- **Language:** English
- **Special features:** None beyond standard platform; custom logo/layout ordering
- **Layout:** Generic `home.tsx`

### 🗼 Tokyo (`tokyo.eventcarpooling.com`) — See `tokyo-digest` skill
- **Auth:** Password-hash HMAC (has passwordHash) — dev and prod hashes differ
- **Curator:** *(blank)*
- **Language:** English + Japanese (toggle available; Japanese strings in `i18n/ja.ts`)
- **Special features:** AI translation of event titles/descriptions on digest import (prewarm via slug check, not hardcoded ID); language toggle persists globally as `ec-lang`
- **Layout:** Generic `home.tsx` with Japanese-specific hero/category styling

### 🌿 AustinCares (`austincares.eventcarpooling.com`)
- **Auth:** Password-hash HMAC (has passwordHash)
- **Curator:** *(blank)*
- **Language:** English
- **Special features:** Dedicated pages — `/` → AustinCares Deals, `/full` → Full edition with deals map, community submission form
- **Layout:** `austin-cares-deals.tsx` and `austin-cares-full.tsx` (not generic `home.tsx`)

## Auth Quick Reference

| City | Auth Pattern | Notes |
|------|-------------|-------|
| Austin | Password-hash HMAC | Dev ≠ prod hash |
| Tokyo | Password-hash HMAC | Dev ≠ prod hash |
| AustinCares | Password-hash HMAC | Dev ≠ prod hash |
| Sacramento | Email-based HMAC | Null passwordHash |
| Portland | Email-based HMAC | Null passwordHash |
| St. Louis | Email-based HMAC | Null passwordHash |
| Brushy Creek | Email-based HMAC | Null passwordHash |
| Bulverde | Email-based HMAC | Null passwordHash |

See `admin-api-auth` skill for token computation details.

## Health Check Bypass

`GET /api/healthz` and `GET /api` are registered **before** `app.use(resolveTenant)` in `app.ts` — health probes never trigger DB lookups.

## Adding a New City

1. Insert a row into `tenants` with `slug`, `name`, `domain`, `is_active = true`, and optionally `curator_name`, `admin_email`, `theme`
2. Register the subdomain in Replit Domains
3. The city immediately gets: digest page, Ticketmaster events, geocoding, admin panel, subscriber emails

## Relevant Files

- `artifacts/api-server/src/middleware/resolveTenant.ts` — slug extraction + DB lookup
- `artifacts/api-server/src/app.ts` — health check bypass before resolveTenant
- `artifacts/api-server/src/lib/emailService.ts` — per-city theme/branding (colors, curator, digest name)
- `artifacts/austin-events/src/components/layout.tsx` — per-city header/logo/tagline
- `artifacts/austin-events/src/App.tsx` — route definitions per tenant
