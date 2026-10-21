---
name: Newsletter sender choice
description: Use Titan SMTP for outbound mail while keeping Gmail credentials dedicated to inbox reading.
---

Send outbound app email through Titan SMTP using the Titan mailbox as the authenticated sender. Keep the Gmail credentials separate for incoming newsletter parsing. Newsletter editions use the selected sender address with a city-specific “No Reply” display label and omit Reply-To so responses go to From; transactional emails keep their individual reply targets.

Keep the current newsletter sender address unchanged for now; branding updates apply to page and message copy, not the sender configuration.

**Why:** The user chose Titan for outgoing delivery so the old Gmail mailbox does not appear as the sender, while the existing Gmail inbox remains needed for newsletter intake. The user also asked to keep the current newsletter sender address unchanged for now.

**How to apply:** Configure outgoing Titan SMTP independently from Gmail IMAP credentials. Do not fall back to Gmail when Titan is not configured. Omit Reply-To on newsletter messages and preserve transactional reply targets. Do not change the sender address without new user direction.
