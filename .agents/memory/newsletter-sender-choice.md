---
name: Newsletter sender choice
description: Use the verified newsletter sender alias with a No Reply display label while keeping human replies separate.
---

Use the verified project sender address in the From header for newsletter editions and test sends, with a “No Reply” display label and the designated human reply mailbox. Keep this separate from transactional email sender and reply rules.

**Why:** The user wants the authenticated Gmail mailbox hidden from newsletter recipients and supplied a verified sender alias; human replies should continue to route separately.

**How to apply:** Apply the sender alias and No Reply label only through the shared newsletter send path. Do not change transactional email behavior or provider configuration.
