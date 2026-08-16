---
name: Spotlight endpoint format
description: The correct request shape for POST /api/events/digest/:id/spotlight — different from the digest-workflow skill's documented format
---

# Spotlight Endpoint — Correct Format

The digest-workflow skill documents a `{ businessSpotlight, communitySpotlight }` format that **does not exist**. The actual endpoint is:

```
POST /api/events/digest/:id/spotlight
{
  "url": "https://...",           // required, must start with http
  "type": "business" | "community" | "event",
  "title": "Override title",     // optional; falls back to OG/JSON-LD scrape
  "description": "Override desc" // optional; falls back to OG/JSON-LD scrape
}
```

**Why:** The endpoint calls `fetchUrlMeta(url)` to scrape OG tags, then overrides with `title`/`description` if provided. It adds `isBusinessSpotlight: true` for type=business and `isPost: true` for type=community.

**How to apply:** Call it twice per city — once for business, once for community — with explicit `title` and `description` to avoid relying on OG scraping (which can fail or return generic text).

The response is `{ success: true, digest: { events: [...] } }`.

Source: `artifacts/api-server/src/routes/events.ts` lines 465–535.
