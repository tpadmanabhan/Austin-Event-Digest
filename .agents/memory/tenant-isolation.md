---
name: Tenant isolation
description: User directive to prevent cross-tenant effects in shared IRL Group code.
---

For shared IRL Group changes, scope writes, route behavior, and UI changes to the intended tenant or tenants. Preserve all other tenants' behavior and data.

**Why:** the user asked, “Ensure no impact to other tenants.”

**How to apply:** Before shared API or UI changes, audit tenant routing and database scoping, then test that the intended tenant can use the new behavior and unrelated tenant slugs cannot.
