---
name: push-to-production
description: Push event digest data or other changes from the dev environment to the production database. Use when the user asks to sync dev data to prod, push a digest live, or update production records.
---

# Push to Production

## Key Facts

- **Dev and production are completely separate databases.** The dev Replit PostgreSQL and the production Neon database have independent data — including different admin tokens (passwordHash values differ per environment).
- **Production URL:** `https://eventcarpooling.com` / `https://<city>.eventcarpooling.com`
- **Code changes** → Publish via Replit deploy button
- **Data changes** → API calls directly to the production endpoint with a production admin token

## Step-by-Step: Patch a Production Digest

### 1. Get the production admin token

```js
// In CodeExecution:
const result = await executeSql({
  sqlQuery: "SELECT password_hash FROM tenants WHERE slug = 'austin'",
  environment: "production"
});
// Extract passwordHash from result.output, then:
import crypto from "crypto";
const token = crypto.createHmac("sha256", passwordHash).update("admin-session").digest("hex");
```

### 2. Fetch the current production digest events

```bash
curl -s "https://austin.eventcarpooling.com/api/events/digest/latest" \
  -H "Authorization: Bearer $PROD_TOKEN" > /tmp/prod_digest.json
```

### 3. Build the patch payload

```python
import json

with open("/tmp/prod_digest.json") as f:
    d = json.load(f)

events = d.get("digest", d).get("events", [])

new_event = { ... }  # your new event object
events.append(new_event)

with open("/tmp/patch_payload.json", "w") as f:
    json.dump({"events": events}, f)
```

> **Always write to a file then use `-d @file`.** Piping JSON directly (`... | curl ... -d @-`) can silently drop data and return an empty success.

### 4. PATCH the production digest

```bash
curl -s -X PATCH "https://austin.eventcarpooling.com/api/events/digest/{digestId}/events" \
  -H "Authorization: Bearer $PROD_TOKEN" \
  -H "Content-Type: application/json" \
  -d @/tmp/patch_payload.json
```

Check `"success": true` and `"Total events"` count in the response.

## How to Find the Production Digest ID

```bash
curl -s "https://austin.eventcarpooling.com/api/events/digest/list" \
  -H "Authorization: Bearer $PROD_TOKEN"
```

Look for the digest whose `weekOf` matches the target week.

## Neon Production Database

Production runs on **Neon PostgreSQL** (console.neon.tech). The compute endpoint auto-suspends when idle. If production API calls fail with 500 or hang, go to console.neon.tech and re-enable the endpoint.

## Health Check

`GET /api/healthz` and `GET /api` return `{ status: "ok" }` without querying the database. These are registered **before** `app.use(resolveTenant)` in `app.ts` — do not remove them or move them after resolveTenant.

## Event Object Shape

```js
{
  title: string,
  date: string,          // e.g. "Saturday, Aug 8 at 5:00 PM" — use local city time, not UTC
  venue: string,         // "Venue Name, Street Address, City, State ZIP"
  description: string,
  link: string,
  category: string,      // "Tech" | "Music" | "Sports" | "Arts" | "Food" | etc.
  imageUrl: string | null,
  source: string,        // "Partiful" | "Eventbrite" | "Direct" | etc.
  featured: boolean
}
```

> **Time zone gotcha:** `parse-event-url` returns times in UTC. Austin events should use CDT (UTC−5). If the parsed time shows e.g. "10:00 PM", the actual Austin time is "5:00 PM" — correct it manually before patching.
