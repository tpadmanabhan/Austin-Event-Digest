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
- Audit the complete stored carry-forward array against the requested calendar range. Do not assume stale entries were removed merely because public digest responses hide them.
- Live-sourced events win on `title|date` collision (live events are in the array first before dedup).
- Check server logs for `"Carried forward featured events from previous digest"` to confirm it fired.
- Implementation: `carryForwardFeaturedEvents(tenantId, weekOf)` in `artifacts/api-server/src/routes/events.ts`, called right before `autoTagFutureEvents`.

## Verify the raw date range
Retain carried entries only when their actual dates fall inside the requested edition window; resolve ambiguous years from verified source information, not a guessed rollover.

**Why:** Generating a later October edition carried earlier October events into its stored array, while the public response filtered them out. A public event count therefore concealed out-of-range carryovers.

**How to apply:** Inspect raw stored entries after generation, prefer verified structured dates where present, and remove confirmed out-of-range entries from the new edition without modifying the prior edition.
