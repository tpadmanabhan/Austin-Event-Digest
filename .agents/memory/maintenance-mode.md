---
name: Maintenance mode
description: How to put up and take down the eventcarpooling.com platform home maintenance page
---

# Maintenance Mode

## What it does
Shows a branded maintenance page (dancing robot, "We're down for maintenance") on `eventcarpooling.com` only. City subdomains (austin., sacramento., etc.) are unaffected.

## How to toggle
One constant in `artifacts/austin-events/src/App.tsx`:

```ts
// MAINTENANCE_MODE — set to false to restore the platform home
const MAINTENANCE_MODE = true;
```

Set to `false` and redeploy to restore the original platform home.

**Why:** Only `isPlatformRoot` (hostname === "eventcarpooling.com") renders the maintenance page. All city subdomains always use `CityRoutes` regardless of this flag.

## How to apply
1. Open `artifacts/austin-events/src/App.tsx`
2. Flip `MAINTENANCE_MODE` to `false`
3. Publish (deploy) — one redeploy is required for the change to go live

## Assets
- Logo: `artifacts/austin-events/public/eventcarpooling-logo.png`
- Maintenance page component: `artifacts/austin-events/src/pages/maintenance.tsx`
