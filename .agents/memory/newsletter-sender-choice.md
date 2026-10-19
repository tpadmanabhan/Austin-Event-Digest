---
name: Newsletter sender choice
description: Use Titan SMTP for outbound mail while keeping Gmail credentials dedicated to inbox reading.
---

Send outbound app email through Titan SMTP using the Titan mailbox as the authenticated sender. Keep the Gmail credentials separate for incoming newsletter parsing. Newsletter editions use the selected sender address with a city-specific “No Reply” display label and support Reply-To; transactional emails keep their individual reply targets.

**Why:** The user chose Titan for outgoing delivery so the old Gmail mailbox does not appear as the sender, while the existing Gmail inbox remains needed for newsletter intake.

**How to apply:** Configure outgoing Titan SMTP independently from Gmail IMAP credentials. Do not fall back to Gmail when Titan is not configured. Use the support Reply-To only for newsletters and preserve transactional reply targets. Confirm actual From and Reply-To headers before sending editions.
