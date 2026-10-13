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

## Complete, published and sent are different states

Check desktop and phone layouts, category filtering, event visibility and the email preview before saying the update is ready. Preserve older editions and send metadata.

Live data edits through authenticated production APIs do not require publication. New page or email-template code does. Offer the user Publish; do not publish automatically. A successful build or local preview is not proof that the new code is live.

Report exactly what was completed and which requested recipients were confirmed. Sending named copies does not authorize a later subscriber-wide send.
