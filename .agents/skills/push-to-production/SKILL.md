---
name: push-to-production
description: Push event digest data or other changes from the dev environment to the production database. Use when the user asks to sync dev data to prod, push a digest live, or update production records.
---

# Push to Production

## Key Facts

- **Dev and production are separate environments.** Their tenant rows, digests, and admin credentials may differ; always target and authenticate to the intended city subdomain.
- **Production URL:** `https://eventcarpooling.com` / `https://<city>.eventcarpooling.com`
- **Code changes** → Publish via Replit deploy button.
- **Production data writes** → Use the authenticated production API. Production `executeSql` is for read-only inspection; do not try to write production rows directly with it.
- Public GET endpoints such as `/api/events/digest/latest` do not validate admin credentials.

## Safely edit or publish digest data

### 1. Identify the target digest and tenant

Use the correct city subdomain and list digests with `GET /api/events/digest/list`; confirm its ID, `weekOf`, subject, and tenant against the intended publication. A digest may span beyond its nominal week. Do not hard-code a digest ID or assume that “latest” means the digest being edited. For authentication procedures see `admin-api-auth`.

### 2. Prefer a scoped event edit

For a title/date/venue/category/description change on one event, use `PATCH /api/events/digest/:id/events/:idx` with only the intended fields. The index is in the **raw stored array**, not the filtered public list. This route merges those fields into the stored event and preserves its other properties; it cannot edit link, image, coordinates, source, or spotlight flags.

**Do not use `PATCH /api/events/digest/:id/events` as a one-event edit.** It replaces the entire event array and runs every supplied object through `EventItemSchema`; fields outside that schema are dropped. It rejects an empty array, so it is not a clear-all/delete-all operation.

### 3. Do not build a replacement array from a public digest response

`GET /api/events/digest/latest` and `/digest/list` return `digestToApi()` projections, not raw stored events. That projection filters past events and adult content. Replacing the stored array with one of these responses can erase filtered historical events; the replace-all PATCH also normalizes objects and strips fields not in the schema. **Never reconstruct a full replacement payload from those GET responses.**

If a complete replacement is explicitly required, first obtain and review the full raw event array for the exact tenant and digest using an authorized read-only source, preserve every stored property, compare the intended result against the original, and understand that the replace-all route still strips properties not represented by `EventItemSchema`. If preserving such fields is required, do not use that route; use a supported scoped operation or change the API implementation first.

After a write, check the HTTP status and response, then re-read the target digest and verify its week, intended fields, and event count. A response from `digestToApi()` may omit stale/adult events and is not proof that the raw stored array is unchanged.

### 4. Copy a dev digest to production (where supported)

The admin UI's production-status check compares digest weeks. Its push action uses `POST /api/events/digest/:id/push-to-prod`, supported only for Sacramento, Portland, Bulverde, St. Louis, Brushy Creek, and Tokyo. It authenticates with production email-HMAC configuration and imports a **new** digest; it is not an update-in-place operation. Check for an existing matching week first and verify production afterward.

For Austin, AustinCares, or another unsupported tenant, do not assume the push action works or copy an email-based token pattern. Use the authenticated production admin workflow/API available for that tenant.

## Neon Production Database

Production runs on Neon PostgreSQL. If production API calls fail, investigate availability through authorized operational tooling; do not treat a public GET or a successful database read as evidence that an authenticated write succeeded.

`executeSql` with `environment: "production"` is read-only: use it for SELECT/inspection, not INSERT/UPDATE/DELETE. Writes to existing production data go through authenticated tenant-scoped API routes. Tenant provisioning is code-driven through `startupMigration.ts` and a deploy; do not attempt to create a production tenant with a direct SQL write.

## Email-Based HMAC Cities

For email-HMAC tenants, use the exact tenant ID and admin email from the target environment and compute the token at runtime as described in `admin-api-auth`. Do not rely on fixed tenant IDs. Keep the secret and derived token in memory only; never print, log, or persist them.

## New City Onboarding (Production)

1. Add the idempotent tenant seed to `startupMigration.ts` and deploy; startup migration creates/configures the tenant.
2. Register its domain and complete the tenant-specific routing, branding, and source configuration.
3. Use the authenticated tenant API to generate/import the first digest and verify it on that tenant's host.

## Health Check

`GET /api/healthz` and `GET /api` return `{ status: "ok" }` without querying the database. They are registered before `app.use(resolveTenant)` in `app.ts`.

## Event Object Shape

```js
{
  title: string,
  date: string,          // e.g. "Saturday, Aug 8 at 5:00 PM" — use local city time, not UTC
  venue: string,         // "Venue Name, Street Address, City, State ZIP"
  description: string,
  category: string,
  link?: string | null,
  imageUrl?: string | null,
  source?: string | null,
  featured?: boolean,
  isPost?: boolean,
  isBusinessSpotlight?: boolean,
  deadline?: string | null,
  lat?: number | null,
  lng?: number | null
}
```

> **Time zone gotcha:** `parse-event-url` constructs display dates from source timestamps using the server's local time zone; these may differ from the event city's local time. Verify the source timestamp/time zone and daylight-saving offset before storing a display date, rather than applying a fixed UTC−5 shift.
