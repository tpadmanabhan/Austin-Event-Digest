---
name: Publication readiness checks
description: Avoid false build failures and separate shipped implementation from database-backed newsletter content.
---

Verify publishing with the artifact's build context. A bare workspace-wide build can lack the PORT and BASE_PATH values required by the Vite configurations even though the application code is valid.

**Why:** A publication audit initially failed on missing build context after all type checks passed.

**How to apply:** Reproduce the relevant build settings for validation without persisting placeholder settings or weakening configuration checks.

Validate database-backed invitation text against the saved edition and rendered newsletter, not solely by searching the client JavaScript bundle.

**Why:** The client dynamically consumes event descriptions; a bundle-text assertion incorrectly treated a saved invitation as missing.

**How to apply:** Check compiled implementation and production data separately, then inspect the actual rendered output. A successful build alone does not prove that the current published code or data matches it.
