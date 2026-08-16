---
name: Production admin token
description: How to compute a valid Bearer token for requireAdmin endpoints on the production API
---

# Production Admin Token

## The rule
Admin token = `crypto.createHmac("sha256", tenant.passwordHash).update("admin-session").digest("hex")`

The `passwordHash` lives on the **tenant row** in the `tenants` table, not in a separate admins table.  
Query prod DB: `SELECT id, slug, password_hash FROM tenants ORDER BY id`  
Each tenant has its own passwordHash → its own token.

**Why:** The bcrypt hash is stored per-tenant (not globally), and the token is derived from it. Hash rotates on redeploy, so recompute after every deploy.

**How to apply:**
1. Query prod DB for `password_hash` from `tenants` table
2. `HMAC(passwordHash, "admin-session")` — the string "admin-session" is the HMAC message, passwordHash is the key
3. Use as `Authorization: Bearer <token>` against `<slug>.eventcarpooling.com`
4. GET endpoints like `/api/events/digest/list` are public (no auth needed)
5. POST/PATCH/DELETE endpoints use requireAdmin — use per-tenant token

## Alternative: email-based admin
`HMAC(RSVP_HMAC_SECRET, "admin-email:<tenantId>:<email>")` — used for Brushy Creek. See brushycreek-admin-auth.md.

## Pitfalls
- Do NOT use `HMAC(SESSION_SECRET, ADMIN_PASSWORD)` — that was wrong and returns 401
- Do NOT reuse tokens across tenants — each tenant has a different passwordHash → different token
- The production generate endpoint falls back to `generateSampleDigest()` when adapters return nothing — always verify events are real before keeping generated digests; delete immediately if they contain hallucinated fallback events (e.g. "Barton Springs Sunday Swim", "South Congress Farmers Market")
- Austin `password_hash` rotates on every deploy — always re-query prod DB before computing the Austin token; stale token returns 401 on writes but 200 on public GETs (which don't require auth)
