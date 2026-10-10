---
name: tenant-routing
description: Understand how the multi-tenant routing system works for eventcarpooling.com. Use when adding a new city, debugging tenant resolution, or working on per-city branding, email templates, or API routing.
---

# Tenant Routing

## Public HTML checklist for every city

New active cities use the shared dynamic public web server; do not add API-only document handlers or restore a static SPA catch-all. Keep tenant Host forwarding intact through the internal proxy.

After city setup, follow `docs/public-pages-publishing.md`: inspect no-JavaScript homepage/edition/event/venue content, correct branding/canonicals, robots and XML sitemap, real 404s for unknown tenants, and enabled navigation/signup/map controls. Treat AustinCares as deals and Tokyo as bilingual; never advertise unconfigured adapters as available features.

Use persistent event/venue identities and source-verified ISO metadata. Keep signed subscriber actions private and preserve exact legacy inputs. Publishing and notifications require separate authorization.

## How It Works

Every city runs on the same codebase but gets its own branded experience via subdomain. `app.ts` trusts the proxy, then `resolveTenant.ts` derives a slug from the request host and looks up an active tenant row. In production, a city subdomain such as `austin.eventcarpooling.com` selects that tenant; the root domain and the reserved `www`/`api` hosts have no tenant context. City routes are mounted behind `requireTenant`; admin routes additionally use `requireAdmin`.

## Host and environment routing

- In non-production only, `X-Tenant-Slug` can override the tenant for dev/testing.
- On `localhost`, `127.0.0.1`, `*.replit.dev`, and `*.repl.co`, subdomain parsing is skipped; `DEFAULT_TENANT_SLUG` selects the dev tenant.
- In production, the dev header and `DEFAULT_TENANT_SLUG` are ignored. The leading subdomain is used; a missing or unknown/inactive tenant does not silently fall back to another city.
- `/api/healthz` and `/api` are registered before tenant resolution. The router also has platform-level routes that do not require a tenant; not every `/api` route is city-scoped.

### Verify the correct tenant in development

The ordinary preview hostname selects the default development tenant, normally Austin. A tenant-specific route such as AustinCares `/full` can return 404 on that host even when it works on its intended city hostname.

For API checks, send the intended city `Host` header or the development-only tenant override. For visual checks, use a browser resolving that city's hostname to the shared local proxy on port 80, with its browser proxy disabled. Changing only the API header does not prove the frontend identified the same tenant. Verify the visible city branding and expected route before judging the page.

When using Chromium's debugger, select an actual `type: "page"` target, not an extension background target. The first debugger target is not necessarily the application.

### Audit city-specific content across surfaces

Changes to one city's editorial sections, curator claims, images, or action labels must be guarded by that tenant on the landing page, full edition, and email independently. Check a non-target city as well as the target. For Austin's AI Ethics section, community-post registration label, recurring photos, and qualified curator wording, see the digest workflow's [Austin edition maintenance](../digest-workflow/references/austin-edition-maintenance.md).

## City Reference

### 🤠 Austin (`austin.eventcarpooling.com`)
- **Auth:** Password-hash HMAC is accepted by `requireAdmin`. Austin's startup migration re-hashes `ADMIN_PASSWORD` at server startup when configured, so obtain a fresh target-environment hash before deriving a token. Do not assume AustinCares has the same startup rotation; see `admin-api-auth`.
- **Curator:** Raj (customersuccessforgood.com)
- **Language:** English
- **Special features:** Subscriber radius/distance personalization, walkable-only filter, signed preferences token in emails, Nearest First sort
- **Layout:** Generic `home.tsx`; admin panel at `/admin`
- **Community events:** None defined — relies entirely on adapters

### 🌲 Sacramento (`sacramento.eventcarpooling.com`)
- **Auth:** Email-based HMAC — see `admin-api-auth`; resolve the tenant ID and admin email in the environment being targeted.
- **Curator:** Bob
- **Language:** English
- **Special features:** None beyond standard platform
- **Layout:** Generic `home.tsx`; Sacramento-specific intro/flag in home
- **Community events:** Public Library, Old Sac Waterfront Concert, Midtown Farmers Market, Urban Bee Festival, Sac Tech Meetup, Land Park Farmers Market

### 🌹 Portland (`portland.eventcarpooling.com`)
- **Auth:** Email-based HMAC — see `admin-api-auth`.
- **Curator:** *(blank — footer attribution won't render)*
- **Language:** English
- **Special features:** None beyond standard platform
- **Layout:** Generic `home.tsx`
- **Community events:** Community Gardens, Powell's Books, Saturday Market, PSU Farmers Market, Sunday Parkways, Tech Meetup, First Thursday Art Walk
- **⚠️ Ticketmaster geographic bleed:** TM city search for "Portland, OR" sometimes returns events for Portland, **Maine** (e.g. Portland Sea Dogs baseball). Always filter these before sending — look for venues clearly outside Oregon.

### ⚾ St. Louis (`stlouis.eventcarpooling.com`)
- **Auth:** Email-based HMAC — see `admin-api-auth`.
- **Curator:** Phil
- **Language:** English
- **Special features:** None beyond standard platform
- **Layout:** Generic `home.tsx`; St. Louis-specific greeting/flag
- **Community events:** Soulard Market, Gateway Arch, Art Museum, City Museum, STL Tech Meetup, Laumeier, Tower Grove
- **⚠️ Geocoding drift:** Vague venue strings like "Atomic Lounge, St. Louis" geocoded to Las Vegas; "Atomic Garage, St. Louis" geocoded to Des Moines. Always audit coords against the St. Louis bounding box (lat 37–40, lng -96 to -88) before sending. See "Geocoding Drift Audit" in the digest-workflow skill for the fix pattern.

### 🏞️ Brushy Creek (`brushycreek.eventcarpooling.com`)
- **Auth:** Email-based HMAC — see `admin-api-auth`.
- **Curator:** Rohan Vivier
- **Language:** English
- **Special features:** Uses BCRR-specific layout (variable named `isAustinCares` in `layout.tsx`/`home.tsx` checks `slug === "brushycreek"` — intentional naming, not a bug; renders BCRR Weekly Digest header and custom hero)
- **Layout:** Generic `home.tsx` but BCRR-styled via `isAustinCares` flag
- **Community events:** None defined — uses Austin metro Ticketmaster (Sports focus)
- **⚠️ Carry-forward leak:** Austin sample events (Barton Springs, Alamo Drafthouse, ACL Live, South Congress Farmers Market, East Austin Studio Tour) have been found as carry-forward entries in Brushy Creek digests. Always filter these out after generating — they don't belong in a Round Rock/Cedar Park digest.

### 🌄 Bulverde (`bulverde.eventcarpooling.com`)
- **Auth:** Email-based HMAC — see `admin-api-auth`.
- **Curator:** *(blank)*
- **Language:** English
- **Special features:** None beyond standard platform; custom logo/layout ordering
- **Layout:** Generic `home.tsx`
- **Community events:** River Walk, Pearl Farmers Market, Bulverde Community Market, San Antonio Museum of Art, Comal County Civic Forum, Geekdom SA Tech Meetup, La Villita Night Market
- **⚠️ Geocoding bounds:** Bulverde serves the San Antonio metro — geocoding bounds extend to include SA (lat 29.3–30.4, lng -98.8 to -98.0). Name-only SA venues (Laugh Out Loud Comedy Club, Nelson Wolff Stadium, La Villita, Geekdom) require hardcoded coords — Nominatim can't find them from name alone.

### 🗼 Tokyo (`tokyo.eventcarpooling.com`) — See `tokyo-digest` skill
- **Auth:** Email-based HMAC — see `admin-api-auth`; resolve the environment-specific tenant ID rather than assuming it.
- **Curator:** *(blank)*
- **Language:** English + Japanese (toggle available; Japanese strings in `i18n/ja.ts`)
- **Special features:** AI translation of event titles/descriptions on digest import (prewarm via slug check, not hardcoded ID); the language toggle persists as `ec-lang` on the Tokyo browser origin
- **Layout:** Generic `home.tsx` with Japanese-specific hero/category styling
- **Japanese translation coverage:** `translateEvent()` is called on all card types — regular events, featured/amber-framed events, Business Spotlight, Community Spotlight. Section headers ("Business Spotlight" → "ビジネススポットライト"), button labels ("Visit Website" → "ウェブサイトを見る", "Apply Now" → "今すぐ申し込む") are also translated via `jt()` + `JA.*`.
- **⚠️ Carry-forward leak:** Austin sample events (Barton Springs, Alamo Drafthouse, ACL Live) have been found as carry-forward `featured: true` entries in Tokyo digests. Always check for and remove Austin-venue events after generating or importing a Tokyo digest.

### 🏛️ DC (`dc.eventcarpooling.com`)
- **Auth:** Email-based HMAC — see `admin-api-auth`.
- **Curator:** *(blank)*
- **Language:** English
- **Special features:** None beyond standard platform
- **Layout:** Generic `home.tsx`
- **Community events:** Eastern Market (Arts + Civics), Smithsonian (Arts), DC Tech Meetup (Tech), National Mall Morning Run (Wellness), Kennedy Center Millennium Stage (Arts)
- **⚠️ Geocoding drift:** "Washington" alone geocodes to Washington State — always use "Washington, DC" in venue strings. The Sage venue geocoded to WA state; The National Theatre geocoded to Africa on first pass. Always audit coords against DC metro bounds (lat 38.5–39.2, lng -77.5 to -76.7) before sending.

### 🌿 AustinCares (`austincares.eventcarpooling.com`)
- **Auth:** Password-hash HMAC is accepted by `requireAdmin`; verify the target-environment hash when needed. Do not assume Austin's startup hash rotation applies.
- **Curator:** *(blank)*
- **Language:** English
- **Positioning:** **Weekly deals site**, not an events site. Primary value = the deals directory, not the digest.
- **Special features:** Dedicated pages — `/` → deals landing, `/full` → live deals map + directory + community submission form; digest email links readers to `/full`. The current `applyTenantCategoryRestriction` map is empty, so the events-array route applies no tenant-specific category filter.
- **Layout:** `austin-cares-deals.tsx` and `austin-cares-full.tsx` (not generic `home.tsx`)

## Auth Quick Reference

| City | Auth Pattern | Notes |
|------|-------------|-------|
| Austin | Password-hash HMAC | Startup migration refreshes hash when `ADMIN_PASSWORD` is configured |
| AustinCares | Password-hash HMAC | Do not assume Austin's startup hash rotation |
| Tokyo | Email-based HMAC | Look up target-environment tenant ID and email |
| Sacramento | Email-based HMAC | Look up target-environment tenant ID and email |
| Portland | Email-based HMAC | Look up target-environment tenant ID and email |
| St. Louis | Email-based HMAC | Look up target-environment tenant ID and email |
| Brushy Creek | Email-based HMAC | Look up target-environment tenant ID and email |
| Bulverde | Email-based HMAC | Look up target-environment tenant ID and email |
| DC | Email-based HMAC | Look up target-environment tenant ID and email |

See `admin-api-auth` for token computation and the login/verification caveat. Prefer Bearer auth; never persist or print a token or secret.

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
10. Before considering the new city's first edition complete, curate one local **Business Spotlight** and one local **Community Spotlight**, unless the user specifies otherwise. Verify each against an official website, use accurate descriptions and working absolute image URLs, and add them to the intended city edition with `isBusinessSpotlight: true` or `isPost: true`. Check the **All** view on both the landing page and full edition; verify email rendering separately without sending.

Spotlights are per-edition entries, not automatically seeded tenant settings. When preparing a subsequent edition, inspect the previous edition's spotlights and explicitly retain or replace still-current selections; do not assume featured-event carry-forward includes undated spotlights. Recheck deadline-based community posts and do not retain expired calls to action. This checklist guides agent work; it does not implement automatic carry-forward in the generator.

## Relevant Files

- `artifacts/api-server/src/middleware/resolveTenant.ts` — slug extraction + DB lookup
- `artifacts/api-server/src/app.ts` — health check bypass before resolveTenant
- `artifacts/api-server/src/lib/emailService.ts` — per-city theme/branding (colors, curator, digest name)
- `artifacts/austin-events/src/components/layout.tsx` — per-city header/logo/tagline
- `artifacts/austin-events/src/App.tsx` — route definitions per tenant
- `artifacts/api-server/src/lib/weeklyRefresh.ts` — COMMUNITY_EVENTS map (curated recurring events per city)
