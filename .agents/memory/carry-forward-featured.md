---
name: Carry-forward featured events on digest generate
description: The generate endpoint carries forward featured events from the previous digest that live adapters can't rediscover.
---

# Carry-Forward of Featured Events in Digest Generate

## The Rule
`POST /api/events/digest/generate` now auto-includes any `featured: true` events from the most recent existing digest for that tenant whose dates are still >= the new `weekOf`. This prevents manually-curated multi-week events from disappearing each time a new digest is generated.

**Why:** Live adapters (Ticketmaster, Gmail, community events) only return events they can discover. Events added by hand — multi-night shows, conferences, anything not in a live feed — were silently dropped every week without this.

## How to Apply
- No action needed at generate time — it fires automatically.
- If a carry-forward event is stale (date < weekOf), it is correctly filtered out.
- Live-sourced events win on `title|date` collision (live events are in the array first before dedup).
- Check server logs for `"Carried forward featured events from previous digest"` to confirm it fired.
- Implementation: `carryForwardFeaturedEvents(tenantId, weekOf)` in `artifacts/api-server/src/routes/events.ts`, called right before `autoTagFutureEvents`.
