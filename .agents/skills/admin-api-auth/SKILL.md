---
name: admin-api-auth
description: Authenticate with city admin APIs. Use when making admin API calls for any city on the platform — generating digests, sending emails, patching events, etc. Two different token patterns exist depending on the city.
---

# Admin API Auth

There are **two different admin token patterns** depending on the city (tenant). Getting this wrong returns 401.

## Pattern 1: Password-Hash HMAC (Austin, AustinCares)

For cities where the admin set a password:

```
token = HMAC-SHA256(tenant.passwordHash, "admin-session")
```

- `tenant.passwordHash` comes from the `tenants` table in the **target** database
- The key is the literal string `"admin-session"`
- **Do NOT** use `HMAC(SESSION_SECRET, ADMIN_PASSWORD)` — that's wrong

To compute in Node.js:
```js
import crypto from "crypto";
const token = crypto.createHmac("sha256", passwordHash).update("admin-session").digest("hex");
```

## ⚠️ Dev vs Production Tokens Are Different

The dev database and the production (Neon) database have **different passwordHash values** for the same tenant. Always fetch the hash from the database you are targeting. **Never reuse a token across sessions** — password hashes are updated on every deploy.

> **Deploy-rotation gotcha (Austin/AustinCares):** The password_hash for Austin and AustinCares changes on every Replit deploy because the server re-hashes the admin password at startup. A stale token returns 401 on PATCH/POST endpoints but will silently succeed on public GET endpoints (which don't require auth) — so a successful GET doesn't mean your token is valid. **Always re-query the prod DB and recompute the token before any write operation in a new session.**

**For dev API calls** (`http://localhost:$PORT/...`):
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

## Pattern 2: Email-Based HMAC (Managed Cities)

For cities with `null` passwordHash: **Sacramento, Portland, Bulverde, St. Louis, Brushy Creek, Tokyo**

```
token = HMAC-SHA256(RSVP_HMAC_SECRET, "admin-email:{tenantId}:{email}")
```

- `RSVP_HMAC_SECRET` is a Replit Secret (env var)
- `email` must be lowercase (`aiimplementationclubaustin@gmail.com`)
- `tenantId` is the integer from the `tenants` table (differs between dev and prod for each city)

```js
import crypto from "crypto";
const message = `admin-email:${tenantId}:${adminEmail.toLowerCase()}`;
const token = crypto.createHmac("sha256", process.env.RSVP_HMAC_SECRET).update(message).digest("hex");
```

**Production tenant IDs for email-based cities:**

| City | Prod Tenant ID | Admin Email | Token (pre-computed, valid until RSVP_HMAC_SECRET rotates) |
|------|---------------|-------------|-------|
| Brushy Creek | 3 | rohanvivier@gmail.com | `65ebf3dcfe8ca96eda1e9fd9f7e7b37e02e8902d8dd356520d31a55ce43fea9d` |
| Sacramento | 4 | aiimplementationclubaustin@gmail.com | `080845489daa18a35b88458323e7329e751bd4aeed2e204e39f813a740304753` |
| Portland | 5 | aiimplementationclubaustin@gmail.com | `594826f3ea05285a9b54d82e693e3b4e66533ddc52ae0894954f4b7c8b56c464` |
| Bulverde | 6 | aiimplementationclubaustin@gmail.com | `256f55c15ad8908b99e9fb68d4a952b24a7b5597e07896e278d6f3968ba8a307` |
| St. Louis | 7 | aiimplementationclubaustin@gmail.com | `2fd6033d16c069bc3db90536c9e5dc463947c88538cd4a095b0f99510777cdb6` |
| Tokyo | 8 | aiimplementationclubaustin@gmail.com | `dc44914f68eaf2578b632218c1f0268b0e975e2eec46c5a260c6da5e8d1ad0d8` |
| DC | 217 | aiimplementationclubaustin@gmail.com | `5658e7f85704b92e39c1ce382cf6afc477997aa42ff77ecc708d7dbddaf3b3ac` |

> ⚠️ Email-based tokens depend on `RSVP_HMAC_SECRET` (a Replit Secret), not on the DB. They stay valid as long as the secret doesn't rotate. Re-compute if you get 401.

## Using the Token

Pass as a Bearer header:
```
Authorization: Bearer <token>
```

## Which Cities Use Which Pattern

| City | Slug | Pattern | Notes |
|------|------|---------|-------|
| Austin | `austin` | Password-hash | **Always query prod DB for fresh hash — rotates on every deploy** |
| AustinCares | `austincares` | Password-hash | **Always query prod DB for fresh hash — rotates on every deploy** |
| Tokyo | `tokyo` | Email-based (null passwordHash in both dev and prod) | Prod ID 8; dev ID 4 |
| Sacramento | `sacramento` | Email-based | null passwordHash |
| Portland | `portland` | Email-based | null passwordHash |
| St. Louis | `stlouis` | Email-based | null passwordHash |
| Bulverde | `bulverde` | Email-based | null passwordHash |
| Brushy Creek | `brushycreek` | Email-based | null passwordHash |

## Updating Tenant Branding (name, digestTitle, etc.)

Use `PATCH /api/admin/settings` to update tenant display fields on production without touching the DB directly. This is the right way to fix email FROM names, digest display names, and subject line fallbacks.

```bash
curl -s -X PATCH "https://CITY.eventcarpooling.com/api/admin/settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Austin Cares","digestTitle":"Austin Cares Weekly Deals"}'
```

**Accepted fields:** `name`, `digestTitle`, `accentColor`, `categories`, `adminEmail`, `heroImageUrl`, `brandIconUrl`

**Impact on emails:**
- `name` → controls the Gmail **FROM name** (`fromName: req.tenant?.name`) 
- `digestTitle` → controls the email **header title** and **subject line** (`digestTitle || city + " Events"` fallback)

Setting `digestTitle` explicitly prevents the `" Events"` suffix fallback appearing in the subject. Always set it for any non-standard tenant (e.g. deals sites, community portals).

> This endpoint is on every city subdomain — use the correct city token and subdomain.

## Source of Truth

`artifacts/api-server/src/middleware/requireAdmin.ts` — token verification logic
`artifacts/api-server/src/middleware/resolveTenant.ts` — tenant resolution
