---
name: admin-api-auth
description: Authenticate with city admin APIs. Use when making admin API calls for any city on the platform — generating digests, sending emails, patching events, etc. Two different token patterns exist depending on the city.
---

# Admin API Auth

Protected city admin routes use one of two token patterns, depending on the tenant. Always send the token to the matching city subdomain; tenant resolution and token verification are both scoped to that request's tenant.

## Pattern 1: Password-Hash HMAC (Austin, AustinCares)

For a tenant with a non-null `passwordHash`, `requireAdmin` accepts:

```
token = HMAC-SHA256(tenant.passwordHash, "admin-session")
```

- `tenant.passwordHash` comes from the `tenants` row in the **target** environment
- The key is the literal string `"admin-session"`
- **Do NOT** use `HMAC(SESSION_SECRET, ADMIN_PASSWORD)` — that's wrong

To compute in Node.js:
```js
import crypto from "crypto";
const token = crypto.createHmac("sha256", passwordHash).update("admin-session").digest("hex");
```

## Dev vs Production Tokens

Dev and production have separate tenant rows and may have different password hashes. For Austin, `startupMigration.ts` re-hashes `ADMIN_PASSWORD` at server startup when that variable is set, so the accepted password-hash token can change on restart/deploy. Do not assume AustinCares has that same startup rotation: re-check its target-environment row before deriving this token rather than relying on a cached value.

Public digest GETs do not prove that a supplied token is valid. Verify authentication only with a protected endpoint, and never include passwords, password hashes, HMAC secrets, or derived tokens in source files, logs, or chat.

**For dev API calls** (through the workspace proxy at `http://localhost:80/...`, with the city `Host` header):
```sql
-- Run against dev DB (psql $DATABASE_URL or executeSql without environment param)
SELECT password_hash FROM tenants WHERE slug = 'austin';
```

**For production API calls** (`https://austin.eventcarpooling.com/...`):
```js
// In CodeExecution:
const result = await executeSql({
  sqlQuery: "SELECT password_hash FROM tenants WHERE slug = 'austin'",
  environment: "production"
});
```

Then compute `HMAC(passwordHash, "admin-session")` using the hash from the matching environment.

## Pattern 2: Email-Based HMAC

For tenants authenticated by admin email (normally those with `null` passwordHash):

```
token = HMAC-SHA256(RSVP_HMAC_SECRET, "admin-email:{tenantId}:{email}")
```

- `RSVP_HMAC_SECRET` is a Replit Secret (env var)
- `email` must be lowercase (`aiimplementationclubaustin@gmail.com`)
- `tenantId` is the integer from the tenant row in the environment being targeted (it can differ between dev and production)

```js
import crypto from "crypto";
const message = `admin-email:${tenantId}:${adminEmail.toLowerCase()}`;
const token = crypto.createHmac("sha256", process.env.RSVP_HMAC_SECRET).update(message).digest("hex");
```

Get the correct tenant ID and email from the target tenant configuration/database; do not rely on a hard-coded ID table. Compute the token at runtime. `RSVP_HMAC_SECRET` is a Replit Secret—use the secret-access mechanism for runtime computation without printing or persisting the secret or token. Recompute after secret rotation or tenant email/ID changes.

## Login route caveat

The protected-route middleware accepts the password-hash token for password tenants and the email-HMAC token when `RSVP_HMAC_SECRET` is configured. In the current `routes/admin.ts`, `/admin/login` returns the email-HMAC token even after validating a password, and `/admin/verify` checks the email-HMAC token in both branches. Therefore, for API automation use the token returned by the actual login flow or compute a token that `requireAdmin` accepts for the target tenant; do not assume the token returned by `/admin/login` is the password-hash HMAC. Keep this behavior in mind if changing auth code or its tests.
## Using the Token

Pass as a Bearer header:
```
Authorization: Bearer <token>
```

## Which Cities Use Which Pattern

| City | Slug | Pattern | Notes |
|------|------|---------|-------|
| Austin | `austin` | Password-hash | Re-query the target environment; startup re-hashes when `ADMIN_PASSWORD` is configured |
| AustinCares | `austincares` | Password-hash | Query the target environment; do not assume Austin's startup hash rotation applies |
| Tokyo | `tokyo` | Email-based | Look up target-environment tenant ID and email |
| Sacramento | `sacramento` | Email-based | null passwordHash |
| Portland | `portland` | Email-based | null passwordHash |
| St. Louis | `stlouis` | Email-based | null passwordHash |
| Bulverde | `bulverde` | Email-based | null passwordHash |
| Brushy Creek | `brushycreek` | Email-based | null passwordHash |
| DC | `dc` | Email-based | Look up target-environment tenant ID and email |

## Updating Tenant Branding (name, digestTitle, etc.)

Use `PATCH /api/admin/settings` to update tenant display fields on production without touching the DB directly. This is the right way to fix email FROM names, digest display names, and subject line fallbacks.

```bash
curl -s -X PATCH "https://CITY.eventcarpooling.com/api/admin/settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Austin Cares","digestTitle":"Austin Cares Weekly Deals"}'
```

**Accepted fields:** `name`, `digestTitle`, `accentColor`, `categories`, `adminEmail`, `curatorName`, `heroImageUrl`, `brandIconUrl`

**Impact on emails:**
- `name` → controls the Gmail **FROM name** (`fromName: req.tenant?.name`) 
- `digestTitle` → controls the email **header title** and **subject line** (`digestTitle || city + " Events"` fallback)

Setting `digestTitle` explicitly prevents the `" Events"` suffix fallback appearing in the subject. Always set it for any non-standard tenant (e.g. deals sites, community portals).

> This endpoint is on every city subdomain — use the correct city token and subdomain.

## Source of Truth

`artifacts/api-server/src/middleware/requireAdmin.ts` — token verification logic
`artifacts/api-server/src/middleware/resolveTenant.ts` — tenant resolution
