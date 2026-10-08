---
name: Tokyo development admin auth
description: Environment-specific token verification mismatch when preparing Tokyo editions
---

Do not assume an email-HMAC token derived in the shell will authenticate to the development API just because it authenticates to production. Verify the token against the intended environment's protected admin endpoint before attempting an import. If development verification fails, investigate the running service's secret configuration rather than retrying the same token; a reviewed production import can still use its independently verified authentication, while development preview data may be inserted through the development database.

**Why:** The shell-derived token passed production verification but failed development verification even though both environments had the expected tenant metadata. The shell and running development service may not share the same effective secret configuration.

**How to apply:** For future Tokyo digest imports, test authorization in both environments without displaying or persisting tokens, and keep production and development writes separate.

Secret-existence metadata can disagree with the current shell runtime. An “absent” result is not sufficient reason to request or rotate a signing key if it is already available to runtime code.

**Why:** The secret registry reported the signing key absent, while a runtime presence-only check found it and a runtime-generated token authenticated successfully to production. Development verification still failed.

**How to apply:** Check only the runtime availability boolean, keep signing and authenticated requests inside runtime code, and judge each environment by its protected verification response. Never inspect or print the value, and do not rotate a working production key to repair a development mismatch.