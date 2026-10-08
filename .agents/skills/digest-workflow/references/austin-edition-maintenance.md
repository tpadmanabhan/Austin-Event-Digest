# Austin edition maintenance

Use this reference when maintaining extended Austin editions, repairing event photos, changing Austin editorial content, or troubleshooting newsletter RSVP links. These are reusable workflows, not an activity log.

## Extended editions and sent history

1. Identify the intended edition from its tenant, subject, `weekOf`, and complete stored event array. Do not assume the default seven-day range describes all its events.
2. For generation, send `weekOf` and optional `weekEnd`; the current range filter includes the start and excludes the end. Check the deployed handler before assuming it matches development.
3. Audit every requested local calendar date, stated weekday, event year, and configured category. UTC boundaries can admit the previous local day, and generation caps can omit later days. Curate verified missing events instead of trusting the total count.
4. If a strict start-date cutoff is requested, inspect visible intros, labels, descriptions, and spotlights as well as event dates. For an ongoing festival, describe its remaining dates without repeating an excluded earlier start. Do not rewrite historical dates inside source URLs.
5. Preserve previously sent editions when preparing a different date range: create a new unsent draft unless the user explicitly requests an in-place edit. A page-only addition/removal is not permission to resend email or alter send timestamps.
6. Keep the subject and `weekOf` consistent with the edition. Verify the landing page, full edition, and email preview as applicable; an email preview is not permission to send.

## Event photos and recurring listings

- Prefer a stable organizer-hosted image over an expiring social-media URL. Inspect HTTP status and content type; HTML returned with status 200 is not an image.
- Reference absolute HTTPS URLs in stored `imageUrl` values and email content. Browser-relative asset paths do not work in an email client.
- A frontend image override can repair cards without changing the stored event or outgoing email. Identify which surfaces the user requested, then verify each independently.
- For a recurring series, identify its separate dated instances. Apply a requested shared photo repair to all relevant instances without collapsing them into one event.
- When a bundled local asset is appropriate, use the artifact base path in browser code. Keep any override scoped to the intended tenant and series, preserving other cities' images.
- Check both landing-page and full-edition cards and verify that the referenced image loads. Verify live production separately; a working development asset is not proof it has been published.

## Austin editorial copy and calls to action

- Austin's current curator claim is that Raj personally attends **most** events marked Special. Preserve the qualifier; do not turn it into a guarantee of attending every Special event.
- Austin community-post links use **Register** on both the landing page and full edition. Keep other tenants' existing labels and translations unchanged.
- **Interested?** is the separate interest/RSVP action. Do not relabel it as organizer registration or imply it registers someone with an external event host.
- The **AI Ethics** reading section is Austin-only and appears on both pages and in the email. When changing its wording or links, update both the React section and the email-safe HTML version, and verify non-Austin cities do not receive it.
- Keep the wording and reading links consistent across those surfaces. Preserve valid grammar such as “For a deeper perspective”; do not silently rewrite unrelated editorial text.

### Source and test entry points

- `artifacts/austin-events/src/components/ai-ethics-section.tsx`: web editorial section.
- `artifacts/api-server/src/lib/austinAiEthics.ts`: email-safe editorial section.
- `artifacts/austin-events/src/components/event-card.tsx`: recurring-card image and interest action.
- `artifacts/austin-events/src/pages/home.tsx` and `pages/digest.tsx`: tenant-scoped page integration and community-post labels.
- `artifacts/api-server/src/lib/emailService.test.ts`: email rendering and tenant-isolation checks.

Inspect the current implementation before editing; these pointers are not evidence that a change is deployed.

## Signed RSVP links and Unicode

Newsletter links serialize title, email, and optional name as UTF-8 base64url. Treat their decoded values as exact signed inputs.

1. Decode base64url to bytes and then UTF-8. Calling `atob()` alone yields a binary string and corrupts non-ASCII text.
2. Preserve punctuation, accents, Japanese, emoji, and a leading BOM. Do not trim, normalize Unicode, or reinterpret the decoded signed title.
3. Preserve week-based links and legacy numeric-digest links. A development digest ID can differ from its production counterpart; prefer the existing stable week-based generator for new newsletter links.
4. Retain the current missing/invalid-parameter behavior while testing valid links against their actual signature verifier.
5. Test both standard padded base64 and unpadded base64url, exact round trips, week-based signatures, and compatibility with already-sent links. Do not log subscriber details, signatures, or tokens.

Current entry points are `buildRsvpUrl` in `artifacts/api-server/src/lib/emailService.ts`, `artifacts/austin-events/src/lib/rsvp-params.ts`, and `artifacts/austin-events/src/pages/rsvp.tsx`.

For an RSVP-related implementation change, run the focused regression tests:

```bash
pnpm --filter @workspace/api-server test -- src/lib/rsvpLinkEncoding.test.ts
```

For email/editorial changes, also run the applicable email rendering tests. Documentation-only edits do not require restarting the application or rerunning unrelated app tests.

## Completion and publication

Report separately what changed in development, what was written to live data, and what was verified on the published site. Authenticated production data edits take effect without a republish. Frontend, email-template, and bundled-asset code changes require publishing; neither a local preview nor a Git commit proves that production serves them.

Do not send a draft or subscriber email unless explicitly requested. No verification step above implies permission to send.
