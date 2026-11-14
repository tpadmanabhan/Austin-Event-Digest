---
name: Tenant isolation
description: User directive to prevent cross-tenant effects in shared IRL Group code.
---

For shared IRL Group changes, scope writes, route behavior, and UI changes to the intended tenant or tenants. Preserve all other tenants' behavior and data.

For multi-tenant skills, keep each tenant's domain-specific requirements, defaults, and launch gates explicitly scoped. Do not flatten them into a shared default or drop them when adding a tenant-specific procedure.

**Why:** the user asked, “Ensure no impact to other tenants,” and, “Ensure multi tenant skills are kept with their unique domain attributes.”

**How to apply:** Before shared API or UI changes, audit tenant routing and database scoping, then test that the intended tenant can use the new behavior and unrelated tenant slugs cannot. Before revising a shared skill, preserve the distinct domain rules and defaults for each tenant it covers.
