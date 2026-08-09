---
name: Tokyo production admin auth
description: Tokyo's production tenant has null password_hash — use email-based HMAC, not password-hash HMAC
---

# Tokyo Production Admin Auth

## The rule
Tokyo's `password_hash` is **null in production** (and in dev). Use the email-based HMAC pattern, NOT the password-hash pattern.

```js
const token = crypto.createHmac("sha256", process.env.RSVP_HMAC_SECRET)
  .update("admin-email:8:aiimplementationclubaustin@gmail.com")
  .digest("hex");
```

- Production tenant ID: **8**
- Use against `https://tokyo.eventcarpooling.com/api/...`

Dev token (tenant ID **4** in dev):
```js
crypto.createHmac("sha256", process.env.RSVP_HMAC_SECRET)
  .update("admin-email:4:aiimplementationclubaustin@gmail.com")
  .digest("hex");
```

**Why:** Tokyo was set up without a password (null passwordHash). The `admin-api-auth` skill lists it as "Password-hash" but that entry is incorrect for production — confirmed by testing both patterns. Email-based returns 200; password-hash returns 401.

**How to apply:** Any time you need to call a Tokyo admin API endpoint, generate the email-based token. Do NOT try to HMAC(passwordHash, "admin-session") — passwordHash is null and the result is wrong.
