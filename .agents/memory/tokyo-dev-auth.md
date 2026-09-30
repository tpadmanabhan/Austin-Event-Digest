---
name: Tokyo development admin auth
description: Environment-specific token verification mismatch when preparing Tokyo editions
---

Do not assume an email-HMAC token derived in the shell will authenticate to the development API just because it authenticates to production. Verify the token against the intended environment's protected admin endpoint before attempting an import. If development verification fails, investigate the running service's secret configuration rather than retrying the same token; a reviewed production import can still use its independently verified authentication, while development preview data may be inserted through the development database.

**Why:** The shell-derived token passed production verification but failed development verification even though both environments had the expected tenant metadata. The shell and running development service may not share the same effective secret configuration.

**How to apply:** For future Tokyo digest imports, test authorization in both environments without displaying or persisting tokens, and keep production and development writes separate.