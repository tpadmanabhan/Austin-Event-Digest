---
name: Newsletter sender choice
description: Use the chosen newsletter sender alias for editions and route human replies separately.
---

Use the selected sender alias in the From header for newsletter editions and test sends, with a city-specific “No Reply” display label and the designated support reply mailbox. Keep this separate from transactional email sender and reply rules.

**Why:** The user chose the visible project sender address for newsletter editions while keeping replies routed to support.

**How to apply:** Apply the selected sender alias and support Reply-To only through the shared newsletter send path. With Gmail SMTP, the From address must be a verified Send As alias; the connected OAuth integration can list aliases but cannot create or verify them. Do not send until delivered headers confirm the From address. Do not change transactional email behavior.
