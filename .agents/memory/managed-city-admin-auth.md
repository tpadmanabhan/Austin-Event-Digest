---
name: Managed city admin auth
description: How to generate valid admin tokens for managed city tenants (sacramento, portland, stlouis, bulverde) in production — they have null password_hash so the standard HMAC(passwordHash, "admin-session") approach fails.
---

## The problem
Managed city tenants (sacramento, portland, stlouis, bulverde) have `password_hash = null` in both dev and prod DBs. The standard token formula `HMAC(passwordHash, "admin-session")` returns 401.

## The solution — email-based HMAC token
Use `adminTokenForEmail` from `src/middleware/requireAdmin.ts`:

```js
const { createHmac } = require('crypto');
const secret = process.env.RSVP_HMAC_SECRET; // available in env, length 64
const email = 'aiimplementationclubaustin@gmail.com'; // admin email for all managed cities
const token = createHmac('sha256', secret)
  .update(`admin-email:${tenantId}:${email.toLowerCase()}`)
  .digest('hex');
```

**Why:** These tenants use email-based auth (no password set), gated on `RSVP_HMAC_SECRET` env var which IS set in production.

**How to apply:** Discover `tenantId` by trying IDs 1–10 until a `/api/admin/settings` call returns 200. Known IDs:
- `sacramento` → tenant ID **4**
- `portland` → tenant ID **5**
- `bulverde` → tenant ID **6**
- `stlouis` → tenant ID **7**

## Finding unknown tenant IDs
```js
for (let id = 1; id <= 10; id++) {
  const token = createHmac('sha256', secret).update(`admin-email:${id}:${email}`).digest('hex');
  const r = await fetch(`https://${slug}.eventcarpooling.com/api/admin/settings`, { headers: { Authorization: 'Bearer ' + token } });
  if (r.status === 200) { console.log('tenant ID:', id); break; }
}
```
