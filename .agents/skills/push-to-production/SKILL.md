---
name: push-to-production
description: Push event digest data or other changes from the dev environment to the production database. Use when the user asks to sync dev data to prod, push a digest live, or update production records.
---

# Push to Production

## Key Facts

- **Dev and production are separate environments.** Their tenant rows, digests, and admin credentials may differ; always target and authenticate to the intended city subdomain.
- **Production URL:** `https://irl.group` / `https://<city>.irl.group`
- **Code changes** → Publish via Replit deploy button.
- **Production data writes** → Use the authenticated production API. Production `executeSql` is for read-only inspection; do not try to write production rows directly with it.
- Public GET endpoints such as `/api/events/digest/latest` do not validate admin credentials.
- Git synchronization, development screenshots, and an earlier successful publication do not prove that a newer code or bundled-asset change is live. Verify the actual published behavior and describe unverified code changes as local, not deployed.

## Safely edit or publish digest data

### 1. Identify the target digest and tenant

Use the correct city subdomain and list digests with `GET /api/events/digest/list`; confirm its ID, `weekOf`, subject, and tenant against the intended publication. A digest may span beyond its nominal week. Do not hard-code a digest ID or assume that “latest” means the digest being edited. For authentication procedures see `admin-api-auth`.

### 2. Prefer a scoped event edit

For a title/date/venue/category/description/link change on one event, use `PATCH /api/events/digest/:id/events/:idx` with only the intended fields and the stable `eventId` when available. The server resolves that ID within the tenant and digest, avoiding incorrect targeting when the public/admin list filters earlier events. Without the ID, the index must come from the **raw stored array**, not the filtered public list.

Link-only requests preserve other event fields, IDs, featured flags, order, and edition send metadata without global re-tagging. Use a valid HTTP(S) URL without embedded credentials; explicit `""` or `null` clears the link. The route does not support image, coordinates, source, featured, or spotlight flags. Verify live capability first: older builds reject link-only edits, requiring publication before the scoped change rather than a full-array workaround.

Display-only date formatting is not a schedule change. Inspect metadata invalidation before editing: the scoped date route can clear verified structured timestamps and does not accept them as restoration fields. Follow `.agents/skills/digest-workflow/references/date-ordering-and-preview-checks.md`; compare raw source timestamps afterward and resolve any loss before sending. Do not infer preservation from API success or substitute an unsafe full-array replacement.

**Do not use `PATCH /api/events/digest/:id/events` as a one-event edit.** It replaces the entire event array and runs every supplied object through `EventItemSchema`; fields outside that schema are dropped. It rejects an empty array, so it is not a clear-all/delete-all operation.

### 3. Do not build a replacement array from a public digest response

`GET /api/events/digest/latest` and `/digest/list` return `digestToApi()` projections, not raw stored events. That projection filters past events and adult content. Replacing the stored array with one of these responses can erase filtered historical events; the replace-all PATCH also normalizes objects and strips fields not in the schema. **Never reconstruct a full replacement payload from those GET responses.**

If a complete replacement is explicitly required, first obtain and review the full raw event array for the exact tenant and digest using an authorized read-only source, preserve every stored property, compare the intended result against the original, and understand that the replace-all route still strips properties not represented by `EventItemSchema`. If preserving such fields is required, do not use that route; use a supported scoped operation or change the API implementation first.

After a write, check the HTTP status and response, then re-read the target digest and verify its week, intended fields, and event count. A response from `digestToApi()` may omit stale/adult events and is not proof that the raw stored array is unchanged.

For additions or removals, compare retained raw objects by field/value and relative order, not serialized JSON key order. Verify edition metadata and send timestamps are unchanged, then check the target listing's presence or absence in both public latest/list endpoints. An authenticated data-only update is live immediately and needs no republish; Git commits do not contain database edits. Do not send or resend email unless separately requested.

### 4. Copy a dev digest to production (where supported)

The admin UI's production-status check compares digest weeks. Its push action uses `POST /api/events/digest/:id/push-to-prod`, supported only for Sacramento, Portland, Bulverde, St. Louis, Brushy Creek, and Tokyo. It authenticates with production email-HMAC configuration and imports a **new** digest; it is not an update-in-place operation. Check for an existing matching week first and verify production afterward.

For Austin, AustinCares, or another unsupported tenant, do not assume the push action works. Use the authenticated production admin workflow/API available for that tenant and the authentication procedures in `admin-api-auth`.

#### Golf IRL: publish digest data without deploying code

Golf is not supported by `push-to-prod`. Keep its launch gate intact: a production digest-data update does not authorize tenant creation, DNS changes, code deployment, or an email send. Each needs separate authorization.

For an explicitly authorized Golf edition:

1. Check the production public list and read-only production data for the exact tenant and `weekOf`. If a matching edition already exists, do not create a duplicate; inspect its raw event array and clarify whether the user intends an update.
2. Read the complete development event array and verify the edition metadata. Do not build the replacement from a filtered public GET.
3. If no production edition exists, create one with `POST /api/events/digest/create-empty` and `{ "weekOf": "YYYY-MM-DD" }`. This route supplies Golf's default subject and intro. Then populate it with the complete nonempty array using `PATCH /api/events/digest/:id/events`.
4. Remove development-generated `eventId` and `venueId` fields from the transfer payload so the production tenant receives its own identities. Preserve event content, links, coordinates, spotlight/post flags, order, and explicit `featured: false` values. Check the deployed API's normalization and auto-tagging behavior before relying on exact field preservation.
5. Verify HTTP status and `success: true`, then read the production row and check its `weekOf`, subject, intro, raw event count, event identities, and send metadata. Confirm the public `/digest/latest` and `/digest/list` show the intended edition. A new data-only edition should remain unsent (`sentAt` null and `sentCount` zero).

Never call a digest-send endpoint as part of this data transfer. It is live as soon as the authenticated production API write succeeds; no code republish is needed.

#### Leadership Austin: keep its managed event feed separate

Leadership Austin's persistent `leadership_events` records use the tenant-scoped `/api/events/leadership-managed` API family and are rendered separately from `digests.events`. For a managed-feed update, use that feed's supported admin route; do not create an empty weekly digest or copy the records into the digest array. Preserve `sourceAlumni` attribution and follow `alumni-tenant-rollout` for its organization-specific behavior. Keep Leadership Austin data and links separate from the Austin city tenant.

#### Austin city: use its geographic-edition rules

Austin is the geographic city guide, distinct from both Leadership Austin and Golf. Use the Austin-specific digest workflow and reference for city content, date ranges, curator wording, labels, images, and RSVP links. Do not copy the Leadership Austin managed feed or Golf-specific curation rules into Austin. Use the authenticated tenant-scoped API for approved production data changes; email sending remains a separate authorization.

When the user approves a draft for production sending, follow the comparison and scheduling checklist in `digest-workflow`. Include subject, intro, event order/IDs, links, Special labels, and spotlight flags in the comparison. Explicit `featured: false` must remain false; older deployed auto-tagging code can change it. Do not create a duplicate edition when the intended production edition already exists.

### 5. Inspect or add production subscribers

Use production read-only queries scoped by the city's tenant to list subscribers. Distinguish active subscriptions from unsubscribed records; counts are a current lookup, never a standing constant. Do not save subscriber addresses or lists in agent memory.

To add an address explicitly requested by the user, use the authenticated API on the verified city subdomain:

```text
POST /api/newsletter/subscribers/add
{ "email": "<user-specified-address>" }
```

The handler trims/lowercases the address, inserts a new active record, reports an existing active subscription without creating a duplicate, or reactivates an unsubscribed record. Inspect existing status before reactivating: a generic request to add an address is not permission to override a known opt-out; clarify that case. An optional `name` must come from the user, not a guess. Check HTTP status and success, then re-read the tenant-scoped production record to verify it is active. This operation sends no email and requires no republish; it does not authorize a draft or broadcast.

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
