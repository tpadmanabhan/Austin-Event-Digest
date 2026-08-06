---
name: admin-api-auth
description: Authenticate with city admin APIs. Use when making admin API calls for any city on the platform — generating digests, sending emails, patching events, etc. Two different token patterns exist depending on the city.
---

# Admin API Auth

There are **two different admin token patterns** depending on the city (tenant). Getting this wrong returns 401.

## Pattern 1: Password-Hash HMAC (Most Cities)

For cities where the admin set a password (Austin, Sacramento, Portland, Tokyo, etc.):

```
token = HMAC-SHA256(tenant.passwordHash, "admin-session")
```

- `tenant.passwordHash` comes from the `tenants` table in the database
- The key is the literal string `"admin-session"`
- **Do NOT** use `HMAC(SESSION_SECRET, ADMIN_PASSWORD)` — that's wrong and won't work

To compute in Node.js:
```js
import crypto from "crypto";
const token = crypto.createHmac("sha256", passwordHash).update("admin-session").digest("hex");
```

## Pattern 2: Email-Based HMAC (Managed Cities)

For cities with `null` passwordHash in the tenants table: **Sacramento, Portland, Bulverde, St. Louis, Brushy Creek**

```
token = HMAC-SHA256(RSVP_HMAC_SECRET, "admin-email:{tenantId}:{email}")
```

- `RSVP_HMAC_SECRET` is a Replit Secret (env var)
- `tenantId` is the tenant's slug or numeric ID from the tenants table
- `email` is the admin's email address for that city

To compute in Node.js:
```js
import crypto from "crypto";
const message = `admin-email:${tenantId}:${adminEmail}`;
const token = crypto.createHmac("sha256", process.env.RSVP_HMAC_SECRET).update(message).digest("hex");
```

## Using the Token

Pass as a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

Or as `adminToken` query param for some endpoints.

## Which Cities Use Which Pattern

| City | Pattern | Notes |
|------|---------|-------|
| Austin | Password-hash | Has passwordHash in tenants table |
| Tokyo | Password-hash | Has passwordHash in tenants table |
| Sacramento | Email-based | null passwordHash |
| Portland | Email-based | null passwordHash |
| St. Louis | Email-based | null passwordHash |
| Bulverde | Email-based | null passwordHash |
| Brushy Creek | Email-based | null passwordHash |
| AustinCares | Password-hash | Check tenants table to confirm |

## Source of Truth

`artifacts/api-server/src/middleware/resolveTenant.ts` — tenant resolution
`artifacts/api-server/src/routes/events.ts` — admin token verification logic
