---
name: React SSR footer image loading
description: Keep below-the-fold public footer marks lazy-loaded so they do not alter the server-rendered handoff markup.
---

# React SSR Footer Image Loading

Set footer logos in `PublicDocumentView` to `loading="lazy"`.

**Why:** React's server renderer may emit an image preload link for an eager footer image inside the hydrated root. That changes the initial root markup and can break tests that verify the public document's hydration handoff.

**How to apply:** Keep non-critical footer images lazy-loaded and verify both the rendered public HTML and its hydration/handoff tests when changing public-page branding.
