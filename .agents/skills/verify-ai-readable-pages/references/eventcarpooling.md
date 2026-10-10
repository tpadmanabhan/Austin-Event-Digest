# EventCarpooling implementation reference

Use this reference only in the EventCarpooling workspace; verify named files still exist.

- Follow `docs/public-pages-publishing.md` for the full publish checklist.
- Public documents are served by `artifacts/austin-events/server/index.mjs`.
- Data and routing: `server/public-model.mjs`.
- HTML rendering: `server/entry-server.tsx` and `src/components/public-document-view.tsx`.
- Shared formatting: `src/lib/public-document.ts`.
- Regression tests: `server/public-model.test.mjs`.

## Checks that must not regress

- Platform root stays platform-only; unknown hosts never default to Austin.
- Development uses the workspace proxy. Production uses the verified published API route while preserving the city Host. Inspect the current origin helper rather than hardcoding a port.
- City/edition week labels are calendar dates, not UTC instants converted into the reader's timezone. Example: `2026-10-04T00:00:00.000Z` displays as `Week of October 4, 2026`, not October 3 or a raw timestamp.
- Navigation and city lists reuse the label helper. Example: `Atlanta Events` stays `Atlanta Events`, not `Atlanta Events events`.
- Keep persistent occurrence IDs, original newsletter labels, and signed subscriber inputs. Source enrichment must not rewrite historical curation.
- Only verified metadata qualifies for Event JSON-LD. Missing dates remain missing; non-event posts and AustinCares deals are not Events.
- Carpool-interest descriptions are qualified by actual availability. No promised drivers, seats, matching, or guaranteed rides.
- Preserve Tokyo language controls and AustinCares deals/map behavior.
- Public rendering failures return an honest 503, not an empty successful document. Failure logs must not contain signed queries or credentials.

## Verification after changes

```bash
pnpm --filter @workspace/austin-events run typecheck
pnpm --filter @workspace/austin-events run build
TZ=America/Chicago pnpm --filter @workspace/austin-events run test:public
```

Restart the existing web workflow once after the batch, inspect logs, and check a public preview. For production-default testing, do not set `INTERNAL_API_ORIGIN` to a fixture server.

Publishing is user-initiated. After the user republishes, verify the actual published documents again; never label a workspace-only fix live.
