---
name: push-to-production
description: Push event digest data or other changes from the dev environment to the production database. Use when the user asks to sync dev data to prod, push a digest live, or update production records.
---

# Push to Production

## Key Facts

- **Dev and production are separate databases.** The dev Replit PostgreSQL database and the production Neon database do not share data.
- **Production URL:** `https://eventcarpooling.com` (or `https://<city>.eventcarpooling.com`)
- **Dev URL:** The `.replit.dev` preview domain (temporary, for development only)
- Changes to code are pushed to production via **Publish** (deploy button). Data is pushed separately via API calls to the production endpoint.

## Pushing a Digest to Production

```
POST https://eventcarpooling.com/api/events/digest/import
Host: <city>.eventcarpooling.com
Authorization: Bearer <prod-admin-token>
Content-Type: application/json

{ "digestId": 123, "events": [...] }
```

Get the prod admin token using the `admin-api-auth` skill (compute from the production tenant's `passwordHash`).

## Pushing via the Dev API Proxy

From the dev environment, you can POST to the production API:
```bash
curl -X POST "https://austin.eventcarpooling.com/api/events/digest/import" \
  -H "Authorization: Bearer <prod-token>" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

## Neon Production Database

Production uses **Neon PostgreSQL** (hosted at console.neon.tech). The Neon compute endpoint auto-suspends when idle. If production API calls fail:
1. Go to console.neon.tech and re-enable the compute endpoint
2. The Replit dev database does NOT use `DATABASE_URL` — it's runtime-injected by Replit

## Health Check

The API server exposes `GET /api/healthz` and `GET /api` which return `{ status: "ok" }` **without** querying the database. These short-circuit before `resolveTenant` middleware and are used by the Autoscale health probe. Do not remove these routes or move them after `resolveTenant`.

## Code vs. Data

- **Code changes** → Publish via Replit deploy button
- **Data changes** → API calls to production endpoint with prod admin token
- **Schema changes** → Run migration via startup migration (`startupMigration.ts`) which runs automatically on server start
