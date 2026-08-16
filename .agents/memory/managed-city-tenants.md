---
name: Managed city tenants — dev DB seeding
description: Brushy Creek, Bulverde, Portland, Sacramento do NOT auto-seed in the dev DB; must be manually INSERTed. Includes dev tenant IDs and digest IDs.
---

# Managed City Tenants

## Problem
`brushycreek`, `bulverde`, `portland`, `sacramento` are referenced in the startup migration **only via UPDATE statements** — they don't INSERT. If those rows don't exist the UPDATEs silently no-op, and hitting `/api/tenant/config` for those slugs returns 404.

**Why:** The startup migration assumed these tenants were seeded in a prior session. In a fresh dev DB they are absent.

## Fix
INSERT them manually (idempotent with ON CONFLICT):

```sql
INSERT INTO tenants (slug, name, city, accent_color, categories, is_active, email_verified, admin_email)
VALUES ('portland', 'Portland Events', 'Portland, OR', '#22C55E', '["Arts","Sports","Tech","Civics","Wellness"]'::jsonb, true, true, 'aiimplementationclubaustin@gmail.com')
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, is_active=true;
```

Auth pattern: email-based HMAC (null password_hash). Token = HMAC(RSVP_HMAC_SECRET, "admin-email:{tenantId}:{email}").

## Dev tenant IDs (current dev DB)
| Slug | Dev ID | Email |
|------|--------|-------|
| austin | 1 | aiimplementationclubaustin@gmail.com |
| austincares | 2 | rohanvivier@gmail.com |
| stlouis | 3 | aiimplementationclubaustin@gmail.com |
| tokyo | 4 | aiimplementationclubaustin@gmail.com |
| dc | 94 | aiimplementationclubaustin@gmail.com |
| brushycreek | 131 | rohanvivier@gmail.com |
| bulverde | 132 | aiimplementationclubaustin@gmail.com |
| portland | 133 | aiimplementationclubaustin@gmail.com |
| sacramento | 134 | aiimplementationclubaustin@gmail.com |

## Aug 16–22 digest IDs (dev)
| City | Digest ID | Events | Notes |
|------|-----------|--------|-------|
| austin | 55 | 22 | TM + 4 curated + 2 spotlights |
| stlouis | 56 | 20 | TM + 5 curated + 2 spotlights |
| tokyo | 57 | 8 | TM + 2 curated + 2 spotlights |
| bulverde | 58 | 30 | TM + 3 curated + 2 spotlights |
| sacramento | 59 | 22 | TM + 5 curated + 2 spotlights |
| portland | 60 | 26 | TM + 6 curated + 2 spotlights |
| brushycreek | 61 | 9 | TM + 3 curated + 2 spotlights |

## How to apply
Before any work involving a city that might not exist in the dev DB, run:
`SELECT slug FROM tenants` and verify it's there. If missing, INSERT as above.
