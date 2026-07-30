---
name: St. Louis draft send field name
description: The correct field for test/draft sends to a specific email is testEmail, not draftEmail or isDraft.
---

# St. Louis (and all tenants) — Draft Send Field Name

## Rule
The `/api/events/digest/send` endpoint uses `testEmail` (not `draftEmail`, `isDraft`, or any other variant) to send a one-off test copy to a specific address without marking the digest as sent or going to real subscribers.

## Correct payload
```json
{ "digestId": 87, "testEmail": "someone@example.com" }
```

**Why:** `draftEmail`/`isDraft` are silently ignored by the Zod schema — the request falls through to send to all real subscribers instead, which is a bad accidental full send.

**How to apply:** Any time a "send draft" or "test email" action is needed, use `testEmail` in the POST body.
