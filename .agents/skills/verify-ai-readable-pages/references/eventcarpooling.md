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

## Production-origin and rendering checks

Development's proxy/API origin is not the production route. Test the server's default production API-origin selection while retaining the intended city Host; a fixture override can conceal a dependency on a workspace-only proxy and leave the live renderer unable to load data.

After changing public document rendering, verify useful visible body content, calendar-date labels, unique city names, event/venue links, canonical URLs, and truthful Event JSON-LD before JavaScript runs. Shared formatting must stay consistent between the server document and hydrated client; do not fix the initial HTML by making the interactive page disagree. Report API/source failures honestly instead of substituting empty or fabricated successful content.

## Verification after changes

### Public startup and interactive handoff

- Keep meaningful public HTML available without JavaScript. Do not remove the readable document or substitute an empty root to prevent startup flicker.
- On interactive platform/city/edition pages, JavaScript-enabled startup must not briefly display the simplified reader view. Keep the loading state until the real app commits, then remove the fallback and loader before revealing the app in the same paint.
- Recover to usable public content if the entry script fails or never finishes. Test ordinary loading, deliberately delayed entry loading, JavaScript disabled, and failed entry loading independently; a normal screenshot cannot exercise all four.
- Event, venue and About pages hydrate their server-rendered view instead of using the interactive-page replacement. Preserve the correct branch for not-found and unavailable pages.
- Reuse the server's initial tenant identity in the client. Hostname inference alone can disagree with the initial document behind a development proxy.
- Preserve the readable platform/About description of Spock as the AI assistant and the transparent mascot asset. Do not imply that an AI assistant is a human curator or guarantees attendance or rides.
- Inspect `src/lib/public-handoff.ts`, `src/main.tsx` and `server/public-handoff-ui.test.mjs` before changing startup; verify their current behavior rather than copying an old timer or flag.

### City-specific social metadata

- Use the shared city-share-image resolver in the server document and client metadata. The platform and cities without an assigned image should use a neutral platform asset, not Austin's image.
- Verify absolute HTTPS OG/Twitter image URLs for the intended city, with a reachable image response and suitable content type. Prefer a raster rendition for social preview images; a browser-renderable SVG or HTML response is not proof of crawler compatibility.
- Respect artifact base paths for local images and persistent public-storage paths for generated brand assets. Never construct the production origin from a development domain.
- Compare the original HTML metadata and the hydrated client's metadata. Test representative cities, including San Francisco and Sacramento, and a city without a dedicated image.
- City directory order and NEW badges must agree between the platform's quick links and full city cards; see the digest workflow's city-pages reference. This is separate from the active-city sitemap, which must retain every eligible city.

```bash
pnpm --filter @workspace/austin-events run typecheck
pnpm --filter @workspace/austin-events run build
TZ=America/Chicago pnpm --filter @workspace/austin-events run test:public
```

Restart the existing web workflow once after the batch, inspect logs, and check a public preview. For production-default testing, do not set `INTERNAL_API_ORIGIN` to a fixture server.

Publishing is user-initiated. After the user republishes, verify the actual published documents again; never label a workspace-only fix live.
