---
name: Austin Cares admin auth
description: Admin token for austincares tenant — uses email-based HMAC, different email from other tenants
---

Austin Cares (tenantId=2) has no passwordHash. Uses email-based HMAC auth:

`HMAC(RSVP_HMAC_SECRET, "admin-email:2:rohanvivier@gmail.com")`

**Why:** admin_email is `rohanvivier@gmail.com`, not the `aiimplementationclubaustin@gmail.com` used for Tokyo and other tenants.

**How to apply:** Use this token for any `Authorization: Bearer <token>` call to `https://austincares.eventcarpooling.com/api/events/digest/*/...` admin endpoints.
