---
name: AustinCares rebrand to deals site
description: AustinCares rebranded from events site to weekly deals site — impacts category restriction, email copy, digest population pattern, and UI footer text.
---

# AustinCares Rebrand — Weekly Deals Site

## The Change
AustinCares is now a **weekly deals site**, not an events site. Primary value = the deals directory at `/full`, not the event digest.

## What Was Updated (dev code — needs deploy for remaining items)

### emailService.ts
- `cityGuideText`: "Your weekly guide to the best local deals in Austin"
- `digestDisplayName`: falls back to "Austin Cares Weekly Deals" (overridden by `tenant.digestTitle` in DB)
- `headerEmoji`: 🏷️ (was 🌱) — **needs deploy**
- Added `slug === "austincares"` CTA block: teal bg, rust "See this week's deals →" → `https://austincares.eventcarpooling.com/full`
- Map heading: "Deal locations in Austin" (**needs deploy**)
- Map image alt: "Map of deal locations in Austin" (**needs deploy**)
- Events section heading: "This Week's Deals 🏷️" (**needs deploy**)
- "Also Nearby" copy: "These deals are a bit further out" (**needs deploy**)
- Subscription CTA: "Browse this week's deals →" (**needs deploy**)

### events.ts
- `applyTenantCategoryRestriction` RESTRICTIONS map is now empty — AustinCares no longer restricted to Civics+Wellness.
- Subject line emoji: 🏷️ for austincares (was hardcoded 🤠) — **needs deploy**
- Auto-generated intro: deals-focused copy for austincares — **needs deploy**

### austin-cares-deals.tsx
- Footer: "the best local deals near you" (was "what's happening, and what's on sale, near you")

## Fixed via Production DB/API (live immediately, no deploy needed)
- `tenant.name` = "Austin Cares" → Gmail FROM name
- `tenant.digestTitle` = "Austin Cares Weekly Deals" → email header title, subject line fallback
- Digest 113 intro patched to deals copy
- Digest 113 subject patched to "🏷️ Austin Cares Weekly Deals: Week of Aug 9–15, 2026"

## Production Workaround (until deploy)
Production still enforces `austincares: ["Civics", "Wellness"]` restriction.
When PATCHing deals to the AustinCares production digest, use `category: "Wellness"` for all deals.
After deploy: use `category: "Food & Markets"`.

## Digest Population Pattern
AustinCares digest events = the 7 static deals from `STATIC_DEALS` in `austin-cares-full.tsx`.
All dated Saturday of the current week (e.g. "Saturday, Aug 15") so they stay visible all week.
Category: "Wellness" (production workaround) → "Food & Markets" post-deploy.
Always PATCH intro + subject after generating a new digest — auto-generated copies are Austin-events-flavored.

**Why:** `filterStaleEvents` removes events whose date has passed. Using Saturday (end of week) keeps all deals visible through the week.
