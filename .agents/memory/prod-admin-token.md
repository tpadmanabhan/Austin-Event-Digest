---
name: Production admin token derivation
description: How to generate a valid admin Bearer token for the production API after each redeploy rotates the bcrypt hash
---

## Admin email (preferred — survives redeploys)

Austin tenant admin email: `aiimplementationclubaustin@gmail.com`, tenantId: `1`

Token = `HMAC-SHA256(RSVP_HMAC_SECRET, "admin-email:1:aiimplementationclubaustin@gmail.com")`

This is stable — uses `RSVP_HMAC_SECRET` which never changes. Generate via:
```bash
TOKEN=$(node -e "
  const {createHmac}=require('crypto');
  const secret=process.env.RSVP_HMAC_SECRET;
  console.log(createHmac('sha256',secret).update('admin-email:1:aiimplementationclubaustin@gmail.com').digest('hex'));
")
```

**Requires** `admin_email` to be set in the tenants table. Set in `startupMigration.ts` — takes effect after next publish.

---

## Password-based token (fallback — breaks on redeploy)

`HMAC-SHA256(tenant.passwordHash, "admin-session")` — the `passwordHash` rotates on every redeploy.

**Why:** `startupMigration` re-hashes `ADMIN_PASSWORD` with a fresh bcrypt salt each startup.

**How to apply if email token fails:**
1. Query prod DB: `SELECT password_hash FROM tenants WHERE slug = 'austin'` with `environment: "production"`
2. `TOKEN=$(node -e "const {createHmac}=require('crypto'); console.log(createHmac('sha256','<hash>').update('admin-session').digest('hex'))")`

The login endpoint (`POST /api/admin/login`) requires a Cloudflare Turnstile captcha — cannot be used via curl.
