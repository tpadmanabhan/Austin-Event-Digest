---
name: tenant-routing
description: Understand how the multi-tenant routing system works for eventcarpooling.com. Use when adding a new city, debugging tenant resolution, or working on per-city branding, email templates, or API routing.
---

# Tenant Routing

## How It Works

Every city runs on the same codebase but gets its own branded experience via subdomain:
- `austin.eventcarpooling.com` → Austin tenant
- `stlouis.eventcarpooling.com` → St. Louis tenant
- `austincares.eventcarpooling.com` → AustinCares tenant
- `tokyo.eventcarpooling.com` → Tokyo tenant
- etc.

The **Host header** on every API request is used to look up the tenant in the `tenants` table. This happens in `artifacts/api-server/src/middleware/resolveTenant.ts`.

## Tenant Record (tenants table)

Key columns:
- `id` — numeric ID
- `slug` — URL-safe identifier (e.g. `austin`, `stlouis`)
- `name` — display name (e.g. "Raj's Austin Events")
- `domain` — the subdomain (e.g. `austin.eventcarpooling.com`)
- `passwordHash` — bcrypt hash for admin auth (null for managed cities — see `admin-api-auth` skill)
- `theme` — JSON blob with colors, logo, branding
- `curatorName` — who curates the digest (shown in emails)

## Frontend Tenant Detection

The React frontend detects its tenant via the `useHostname` / `useDomain` hook in `artifacts/austin-events/src/hooks/use-domain.ts`. In dev, it reads from `window.location.hostname`.

## Adding a New City

1. Insert a row into the `tenants` table with the new city's slug, name, and domain
2. Register the subdomain in DNS / Replit Domains
3. The city immediately inherits all platform features (digest, geocoding, Ticketmaster events, etc.)
4. Per-city branding (colors, logos) is set via the `theme` column

## Health Check Bypass

`GET /api/healthz` and `GET /api` are registered **before** `app.use(resolveTenant)` in `artifacts/api-server/src/app.ts`. This means health probes never trigger tenant DB lookups — critical for Autoscale deployments where the Neon DB may be cold/suspended.

## Per-City Email Branding

Email templates in `artifacts/api-server/src/lib/emailService.ts` receive the full `tenant` object and use `tenant.theme` for colors, `tenant.name` for the newsletter name, and `tenant.curatorName` for the sign-off. Each city's welcome email, digest email, and carpool email use the same template system with per-tenant variables injected.

## Common Pitfall

When making API calls from the shell or scripts, always set the `Host` header to the correct city subdomain:
```bash
curl -H "Host: austin.eventcarpooling.com" http://localhost:$PORT/api/events/...
```
Without the right Host header, `resolveTenant` returns 404 or resolves the wrong tenant.

## Relevant Files

- `artifacts/api-server/src/middleware/resolveTenant.ts`
- `artifacts/api-server/src/app.ts`
- `artifacts/austin-events/src/hooks/use-domain.ts`
- `artifacts/austin-events/src/App.tsx`
