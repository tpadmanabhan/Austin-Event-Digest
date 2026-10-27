# City pages, directory placement and targeted sends

Use this alongside the main digest workflow, not instead of its source-verification, raw-array preservation and send-authorization checks.

## Match another city's edition without copying its identity

- Preserve the target city's existing logo, colors, hero, curator and history unless the user requests changes. Reuse the reference city's structure, not its place names, readings, introductions or source events.
- Cover the requested inclusive date range and categories. Verify local AI events under Tech; label regional outings and registration-only locations clearly.
- An extended subject does not automatically update date-range rendering. Inspect the homepage, full edition and email template independently, including any city allowlists and time-zone selection.
- Every city must include AI Ethics, topical to that location. Research its relevant ethical issues and choose fresh, verified resources and books; do not just relabel another city's list. Update the interactive homepage, full edition, readable public document and newsletter template together. Verify author/publisher links: an ISBN page can redirect to a publisher's unavailable-book message even when search still lists it.
- Keep dated events chronological and undated business/community spotlights distinct. Do not use a fabricated date to keep an ongoing spotlight visible.
- Retain organizer-provided coordinates, not just venue names. A valid street address in a separate metadata field may not be used by the current geocoder. Audit stored pins after background geocoding; do not infer or expose an exact location withheld until registration.

## Platform city ordering and NEW labels

1. Find every city list on the platform homepage. In the current app, `platform-home.tsx` has both introductory city links and the larger live-city card directory.
2. Apply the requested position consistently to both lists, preferably through their shared ordering configuration. Count city entries, not a separate “Launch your city” action.
3. Add the requested city's NEW badge to both lists. Preserve other cities' relative order and existing badges; do not remove their labels unless asked.
4. Check that links still target the correct canonical city subdomain. Keep availability filtering intact.
5. Verify the rendered platform-root page rather than the ordinary development preview, which may show a particular city. Check the actual link order and badge text in both lists; a source-array edit alone is not proof of rendered placement.

Do not make one city's requested position a universal default for future cities. Preserve the latest approved ordering unless the next request changes it.

## Reviewed newsletter to explicitly named recipients

- A request to send the reviewed newsletter to specific people authorizes those recipients only, not a subscriber broadcast, signup, or resend to the earlier reviewer.
- Identify the same reviewed edition by city, subject, date range and stored contents. Resolve its ID in the environment being used; development and production IDs differ.
- Use one `POST /api/events/digest/send` call per requested address, with `{ "digestId": <verified-id>, "testEmail": "<requested-address>" }`. Do not set `confirm: true` or omit `testEmail`. This uses the actual newsletter renderer and sender policy without marking the edition as subscriber-sent.
- Prefer the published production renderer. If the reviewed draft uses unpublished template changes, a development send must preserve the reviewed content and canonical production links. Verify that links do not point to localhost or a development numeric digest ID on the production site. Week-based signed RSVP links also require compatible signing configuration and a corresponding production edition.
- Check the authenticated `GET /api/events/digest/:id/preview-email` before sending: subject/range, city branding, both spotlights, readings, event count and links.
- Verify provider success for each recipient. The current handler can return HTTP 200 and `success: true` even when a per-recipient delivery attempt failed; inspect matching email-service success/failure logs rather than relying on that response alone.
- If a request times out or delivery is uncertain, inspect logs before retrying. Do not resend copies already confirmed as sent. SMTP acceptance confirms a send, not inbox placement or that the recipient read it.
- Never save recipient addresses or derived credentials in the skill, reusable scripts or project memory.

## Scheduled production send

When the user asks to send a specific draft to production at a later time, treat content approval, production synchronization, recipient scope, and send time as separate requirements:

1. **Identify both editions.** Confirm the city, target local date and time zone, and source draft by tenant, ID, week, subject, and sent status. Identify the matching production edition independently; never assume dev and production IDs match or that “latest” means the intended edition. A recent test email is not proof that production has the same stored content.
2. **Compare before changing production.** Inspect subject, intro, ordered events, stable event IDs, URLs, featured/spotlight flags, and other email-visible fields. Use complete stored arrays as read-only comparison sources when available. Public projections may filter entries and are unsafe as full-array replacement payloads.
3. **Synchronize only differences.** Prefer supported scoped, tenant-authenticated edits. For a required multi-field update, re-read the complete production array immediately before writing, stop if it changed since review, and retain all records and fields not intentionally changed. Never replace the full event list just to correct one URL. Production SQL is read-only.
4. **Verify production.** Re-read the saved record and confirm the approved content, ID, event count/order, unrelated fields, and send metadata remain intact. Check the authenticated production email preview. Data-only API edits are live immediately; template-code changes require publication and live verification.
5. **Respect the requested local send time.** Resolve the date, time zone, and DST offset to the exact UTC instant. The digest endpoint sends immediately. Use a monitored, one-time background runner only if it can remain active through the send window; confirm whether it is merely queued. If no monitored runner is available, do not claim the send is scheduled or send early. A workspace process is not a durable production scheduler.
6. **Re-check immediately before a broadcast.** Confirm the production edition remains the intended edition, is unsent, still matches the reviewed content, and its authenticated preview works. Verify the active-subscriber count and that all recipients belong to the selected tenant. Only when the user explicitly authorized a full send, make exactly one authenticated request with `confirm: true` and the verified production digest ID.
7. **Monitor and report the actual outcome.** Check HTTP status, response body, delivered/failed counts, and production `sentAt`/`sentCount`. Report requested and actual start/completion times in the city's time zone. If a request times out or the result is unclear, inspect send state and logs before deciding whether another request is safe; never automatically retry a potentially delivered broadcast.
8. **Use the managed runner for a workspace send.** Monitor its returned task ID; do not use a detached Node child in CodeExecution. Record a deterministic fingerprint of the reviewed content and re-check immediately before sending; abort if it changed, the requested time passed, or the edition was already sent. Start at the requested instant and report completion separately. If “CST” means Austin local time during daylight saving, clarify `America/Chicago` and report the actual CDT/CST offset.

Keep production admin tokens and derived credentials in memory or the approved secrets flow; never put them in task scripts, files, logs, or chat. A test send is not authorization for a subscriber-wide send: the user must explicitly authorize the production send, recipient scope, and timing.

## Complete, published and sent are different states

Check desktop and phone layouts, category filtering, event visibility and the email preview before saying the update is ready. Preserve older editions and send metadata.

Live data edits through authenticated production APIs do not require publication. New page or email-template code does. Offer the user Publish; do not publish automatically. A successful build or local preview is not proof that the new code is live.

Report exactly what was completed and which requested recipients were confirmed. Sending named copies does not authorize a later subscriber-wide send.
