---
name: Brushy Creek admin auth
description: How to generate a valid prod admin Bearer token for the brushycreek tenant
---

# Brushy Creek Admin Auth

The password-hash-based token does NOT work for the brushycreek tenant even though the DB has a `password_hash` value. Use the **email-based** token instead.

**Formula:**
```js
const token = crypto.createHmac('sha256', process.env.RSVP_HMAC_SECRET)
  .update('admin-email:3:rohanvivier@gmail.com')
  .digest('hex');
```

- Tenant ID: `3`
- Admin email: `rohanvivier@gmail.com`
- Use as `Authorization: Bearer <token>` against `https://brushycreek.eventcarpooling.com/api/...`

**Why:** The brushycreek tenant's `password_hash` in the DB doesn't match what `req.tenant.passwordHash` resolves to at runtime (likely null or mismatched). The email-based path in `requireAdmin.ts` works correctly because `RSVP_HMAC_SECRET` is set in production.

**How to apply:** Any time you need to call a brushycreek admin API endpoint from a script, generate the token this way. Austin uses the password-hash path; brushycreek uses the email path.
