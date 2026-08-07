---
name: admin-api-auth
description: Authenticate with city admin APIs. Use when making admin API calls for any city on the platform — generating digests, sending emails, patching events, etc. Two different token patterns exist depending on the city.
---

# Admin API Auth

There are **two different admin token patterns** depending on the city (tenant). Getting this wrong returns 401.

## Pattern 1: Password-Hash HMAC (Most Cities)

For cities where the admin set a password (Austin, Tokyo, etc.):

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

The dev database and the production (Neon) database have **different passwordHash values** for the same tenant. Always fetch the hash from the database you are targeting:

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

For cities with `null` passwordHash: **Sacramento, Portland, Bulverde, St. Louis, Brushy Creek**

```
token = HMAC-SHA256(RSVP_HMAC_SECRET, "admin-email:{tenantId}:{email}")
```

- `RSVP_HMAC_SECRET` is a Replit Secret (env var)
- `email` must be lowercase

```js
import crypto from "crypto";
const message = `admin-email:${tenantId}:${adminEmail.toLowerCase()}`;
const token = crypto.createHmac("sha256", process.env.RSVP_HMAC_SECRET).update(message).digest("hex");
```

## Using the Token

Pass as a Bearer header:
```
Authorization: Bearer <token>
```

## Which Cities Use Which Pattern

| City | Pattern | Notes |
|------|---------|-------|
| Austin | Password-hash | Hash differs between dev and prod |
| Tokyo | Password-hash | Hash differs between dev and prod |
| Sacramento | Email-based | null passwordHash |
| Portland | Email-based | null passwordHash |
| St. Louis | Email-based | null passwordHash |
| Bulverde | Email-based | null passwordHash |
| Brushy Creek | Email-based | null passwordHash |

## Source of Truth

`artifacts/api-server/src/middleware/requireAdmin.ts` — token verification logic
`artifacts/api-server/src/middleware/resolveTenant.ts` — tenant resolution
