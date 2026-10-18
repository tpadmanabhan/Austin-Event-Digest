---
name: City provisioning policy
description: Why city requests and city provisioning must remain separate.
---

City requests require manual review and must not provision cities or administrator access. Keep the legacy public signup disabled rather than treating access to the platform root, or a city's valid admin credentials, as platform-wide approval. Customization may be requested and considered during city-page review, but do not promise it.

**Why:** The two-field city-request flow deliberately does not create accounts; the previous public signup bypassed that review process. A routing guard is not an authorization check, and a city administrator is not a platform administrator. The user asked us to state that customization is also considered when someone requests a city page.

**How to apply:** Do not restore self-service provisioning as part of future onboarding changes. When public or email copy invites a city-page request, say customization may be considered without promising it. Any new platform-admin provisioning workflow needs a separate explicit authorization policy. Preserve existing cities, credentials, and previously issued verification links unless a separate migration is approved.
