# Date ordering and newsletter preview checks

Read this when correcting date captions, diagnosing event order, or validating newly added events before sending a draft.

## Distinguish formatting from a schedule change

- Verify the organizer's actual year, local start/end, and timezone before editing.
- A display-only change must retain verified `startDate`, `endDate`, and `timezone`. A real schedule change must invalidate obsolete metadata and replace it only with verified source facts.
- Keep stable event IDs, organizer links, venues, category, featured/spotlight flags, coordinates, and edition send metadata unchanged unless the user requested changes.

## Check all sorting paths

Inspect the homepage, full-edition, and email sorting parsers separately. A stored array in chronological order does not prove the rendered pages sort it correctly.

In the inspected implementation, the homepage and email parsers accept full month names, but the full-edition parser requires an abbreviated month immediately followed by the day. For example, `October 13, 2026` may sort as undated in the full edition. Do not assume this limitation remains unchanged in future builds.

Use a caption compatible with all current parsers, such as `Tuesday, Oct 13 at 11:30 AM – 6:30 PM`, while retaining the verified year and offset in structured timestamps. Use the city's named timezone to format the source timestamp, not the server timezone. Retain the full local date range for multi-day events; a midnight ending remains next-day in `endDate`.

## Edit and verify without losing source metadata

1. Read the target edition's complete raw array and metadata in the intended environment. Identify each event by stable ID and official link.
2. Inspect the deployed route's accepted fields and metadata-invalidation behavior before choosing the write. Prefer a scoped supported edit.
3. In the inspected implementation, a scoped date edit can clear structured start/end/timezone even when only formatting changed. It does not accept those structured fields as restoration inputs. Do not assume unsupported fields were saved.
4. Re-read raw records after editing and compare every object by field/value, not JSON key order. A successful API response and correctly rendered caption are insufficient.
5. If verified metadata was cleared, stop before sending. Restore it only through a supported, preservation-safe operation. Do not automatically switch to full-array replacement: follow the raw-array, schema, concurrency, and preservation safeguards in the main skill, or report that a safer route/code change is needed.
6. Verify retained event count/order, IDs, source timestamps, category and featured flags, spotlights, and edition metadata. Authenticate and verify development and production independently.

## Verify rendered order, not just inclusion

- Check both public latest/list projections and the actual homepage/full-edition body text.
- Match the intended events by official links and visible titles, and compare their displayed sequence against verified start times, including same-day time ordering.
- Check the authenticated newsletter preview independently. All intended regular events must be present and in chronological order; spotlights and featured sections have their own placement rules.
- Decode HTML entities before comparing visible titles and dates. For example, stored `AI Builder's Night` can correctly render from `AI Builder&#39;s Night`; raw-string comparison would falsely report it missing.
- Check organizer links in actual card anchors as well as readable labels. Do not infer order from scripts, JSON-LD, or head metadata.
- Account for the send path's past-event filtering: the preview may include historical events that will not be sent.

## Send only the authorized draft

Use the exact user-confirmed recipient in `testEmail`; never omit it or substitute `draftEmail`/`isDraft`. If “send again” refers to an address no longer available in the conversation, ask rather than guessing from an admin address or subscriber list.

Make exactly one send request after the checks pass. Record its start/completion timestamps safely, check HTTP status and response, and match provider-acceptance logs to the intended recipient and that time window. Do not expose credentials or persist recipient addresses in skills or memory.

The handler can report `success: true` even when a recipient send fails. Require the provider's acceptance log; report acceptance rather than guaranteed inbox delivery. If the result is unclear, inspect logs and send state before considering another request. A test send must leave subscriber-wide `sentAt`/`sentCount` unchanged.
