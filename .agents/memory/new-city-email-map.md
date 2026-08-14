---
name: New city email map checklist
description: When a new city is added, its slug must be registered in emailService MAP_CENTERS and CITY_LABELS or the map is silently omitted from its digest emails.
---

# New city email map registration

## Rule
Every new city slug must be added to both `MAP_CENTERS` and `CITY_LABELS` inside `buildStaticMapSection()` in `artifacts/api-server/src/lib/emailService.ts`. If the slug is absent from `MAP_CENTERS`, the guard `!(slug in MAP_CENTERS)` returns `""` and the map section is silently dropped — no error is thrown.

**Why:** DC launched with a full digest and working email send, but the map was missing from every DC email because the slug was never added to these two lookup tables.

**How to apply:** Any time a new tenant/city is configured (new slug in the `tenants` table), immediately add it to both records in `buildStaticMapSection()` as part of the city setup checklist. Use approximate city-center lat/lng coordinates.
