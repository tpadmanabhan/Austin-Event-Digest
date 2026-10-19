---
name: Newsletter sender choice
description: Use a generic no-reply sender for editions and route human replies separately.
---

Use a generic no-reply address in the From header for newsletter editions and test sends, with a city-specific “No Reply” display label and the designated support reply mailbox. Keep this separate from transactional email sender and reply rules.

**Why:** The user wants a non-personal no-reply sender for newsletters while keeping replies routed to support.

**How to apply:** Apply the no-reply sender and support Reply-To only through the shared newsletter send path. With Gmail SMTP, the From address must be a verified Send As alias; the connected OAuth integration can list aliases but cannot create or verify them. For a sender with no inbox, use a provider authenticated for the sending domain and do not resend until delivered headers confirm the From address. Do not change transactional email behavior.
