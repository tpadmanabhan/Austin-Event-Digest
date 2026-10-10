---
name: Published server-to-server routing
description: Why passing mocked production-response tests did not prove the API origin worked after publishing
---

Verify server-to-server requests with the default production origin, not only a mock origin override.

**Why:** Development and mocked production HTTP tests passed while the published renderer failed because they exercised a workspace loopback proxy that was not present in production. The live API itself remained healthy. A production build alone did not expose this environment mismatch.

**How to apply:** Preserve tenant host forwarding, check the verified published API route, and test production defaults separately from fixture injection. Keep failure logs free of subscriber query strings and credentials. Do not claim a live fix until the user republishes and live requests succeed.
