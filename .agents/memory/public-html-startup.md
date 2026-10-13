---
name: Public HTML and startup
description: Preserve readable public documents without flashing a different layout before the interactive app
---

The simplified public reader page must not flash before the interactive homepage. Do not remove useful no-JavaScript HTML simply to hide that transition.

Every city page must show its own branding from the first visible frame and in shared-link previews, not briefly show Austin or another city. Apply fixes across all cities rather than making a single-city exception.

**Why:** The user explicitly requested this for all city pages after Tokyo's shared link still showed Austin despite the earlier San Francisco fix. Sharing services can use the initial document without running client-side metadata updates.

**How to apply:** Check initial HTML, the actual preview image response, and startup with delayed JavaScript. Verify the city theme and headings before and after the interactive app starts; do not treat correct final branding as proof that no other city flashed.

**Why:** The user reported a subsecond simplified-page preview on eventcarpooling.com and requested its removal. Public HTML readability remains a separate project requirement.

**How to apply:** Verify initial rendering with delayed JavaScript as well as normal loading. Preserve readable content with JavaScript disabled and a usable fallback when startup fails. If implementing full visual server rendering later, render and hydrate matching views rather than replacing one visibly different layout with another.
