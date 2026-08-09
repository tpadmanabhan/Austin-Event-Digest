---
name: Email imageUrl absolute URL requirement
description: Relative imageUrls in digest event objects are silently ignored by email clients — must be absolute.
---

# Email imageUrl Must Be Absolute

## The Rule
Any `imageUrl` field stored in a digest event (or deal) object must be a fully-qualified absolute URL. Relative paths like `/api/storage/objects/uploads/<uuid>` are silently ignored by email clients — no image renders, no error is thrown.

**Why:** Email clients load images from their own context, not relative to any server. A path starting with `/` resolves to nothing.

**Correct format:**
```
https://austincares.eventcarpooling.com/api/storage/objects/uploads/<uuid>
```

**Wrong format (silently broken):**
```
/api/storage/objects/uploads/<uuid>
```

## Code Fix (Dev — in emailService.ts)
Both the regular event card and spotlight card renderers now auto-resolve relative URLs to absolute using `digest.siteUrl`:
```js
const resolvedUrl = raw.startsWith("http") ? raw
  : (raw.startsWith("/") && digest.siteUrl ? `${digest.siteUrl}${raw}` : null);
```
This protects against future relative URLs slipping through on any city.

## How to Apply
- When PATCHing deals or events into a digest, always use the full `https://` URL for `imageUrl`.
- If a stored deal has a relative imageUrl, PATCH the digest events to replace it with the absolute URL before sending the email.
- Object storage uploads return a path — prepend `https://austincares.eventcarpooling.com` (or the relevant city's `siteUrl`) when storing in a deal/event object.
