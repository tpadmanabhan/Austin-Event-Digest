---
name: Public HTML and startup
description: Preserve readable public documents without flashing a different layout before the interactive app
---

The simplified public reader page must not flash before the interactive homepage. Do not remove useful no-JavaScript HTML simply to hide that transition.

**Why:** The user reported a subsecond simplified-page preview on eventcarpooling.com and requested its removal. Public HTML readability remains a separate project requirement.

**How to apply:** Verify initial rendering with delayed JavaScript as well as normal loading. Preserve readable content with JavaScript disabled and a usable fallback when startup fails. If implementing full visual server rendering later, render and hydrate matching views rather than replacing one visibly different layout with another.
