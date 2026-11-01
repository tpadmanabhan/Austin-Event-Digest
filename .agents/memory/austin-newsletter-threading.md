---
name: Austin newsletter threading
description: Keep Austin weekly newsletter subjects distinct so Gmail does not collapse recurring messages together.
---

Include the stored issue week in Austin newsletter email subjects. Keep the issue date stable as the digest's calendar date; do not let a UTC timezone conversion shift it to the prior local day. Other city subject formatting should remain unchanged unless requested.

**Why:** The user saw Gmail's trimmed-content ellipsis controls in an Austin newsletter. The sender had removed date ranges from every weekly subject, likely encouraging Gmail to group separate editions together.

**How to apply:** Pass the Austin digest's `weekOf` through the send path and include it in the subject. After publishing a subject-format change, send only the requested one-recipient test copy and confirm the subject and SMTP result.
