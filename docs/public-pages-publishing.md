# Public pages: publishing and live verification

The feature is verified in development. Publishing, production database edits, emails and SMS are separate actions requiring user authorization.

## Before publishing

- Run shared-library, API and frontend type checks.
- Build the browser and SSR bundles: `pnpm --filter @workspace/austin-events run build`.
- Run `pnpm --filter @workspace/austin-events run test:public` and `pnpm --filter @workspace/api-server run test`.
- Preserve the validated web-service production run command: `node artifacts/austin-events/server/index.mjs` with `NODE_ENV=production`. Do not restore a static SPA catch-all or move public documents exclusively into `/api`.
- The web and API services must both publish, with the shared proxy forwarding document requests to the web service and `/api` requests to the API service.
- Verify publishing/custom-domain configuration using the deployment service. Do not substitute a development domain for a production URL.
- Public identity backfill is additive JSON data enrichment, not a replacement database or table-schema migration. Existing records, edition arrays and subscriber links must remain intact.

## After the user publishes

Use the verified published hosts, including the platform, Austin, another city, Tokyo and AustinCares. Do not submit subscriber, RSVP, admin, email or SMS actions during these checks.

1. Use plain HTTP GETs and a JavaScript-disabled browser to inspect the platform, city homepage, retained edition, real event and its venue. Confirm readable titles, descriptions, source links and internal links in the original HTML.
2. Confirm city-specific canonical, description and social metadata. Unknown subdomains and missing resources must return 404, not an Austin page with status 200.
3. GET `/robots.txt` and `/sitemap.xml` on each host. Expect actual text/plain and XML, not SPA HTML. Root sitemap indexes must reference active city sitemaps; private, signed and post/deal-only event URLs must be absent.
4. Inspect Event JSON-LD on an eligible real event. Date-only sources stay date-only; timed sources need an explicit offset. Compare structured values with visible verified details. No fabricated prices, organizers, travel amenities or availability.
5. With JavaScript enabled, follow an event → venue → newsletter signup journey without submitting. Check map/category interaction, calendar/share controls and Tokyo's English/Japanese toggle. Check mobile overflow and browser errors.
6. Inspect private/admin responses without signing in: noindex, no-store, no subscriber email/signature in the public document payload. Do not weaken authentication for testing.
7. Compare ordinary-reader and crawler responses; content must not depend on User-Agent. Check a subsequent legitimate content edit appears in the next request without stale city cache bleed.
8. Review production web/API logs through the deployment service. If the source/API is unavailable, expect an honest 503 or omitted unverified structured fields, not a fake edition.

## Curating factual event details

- Every public event needs its existing persistent `eventId`; keep it when editing or carrying the occurrence forward. Do not generate identities from array positions or title slugs.
- Preserve exact legacy subscriber query strings, titles, signatures and inputs. Public event URLs never contain subscriber identifiers.
- Use optional `startDate`, `endDate`, `timezone` and `venueAddress` only when verified by the organizer/source. Supply valid ISO dates; timed ISO values include `Z` or an explicit offset. Unknown year, start time, duration, price or address remains unknown.
- Changing a date or venue invalidates obsolete verified metadata. Keep identity preservation and metadata invalidation in every import/update path.
- Existing Ticketmaster records can receive read-only source verification on their event page. A matching source title, stated month/day and venue are required. Unavailable, cancelled, postponed or date-TBA records are not enriched; time-TBA records receive a date only. This does not rewrite newsletter records.
- Existing display dates may differ from updated organizer details. Detail pages display source-verified fields when available; edition records retain their original labels.
- AustinCares is a deals guide. Curated and approved community offers are readable, but not Event JSON-LD or public event/venue detail URLs.
- A city adapter being present in code does not establish live availability. Inspect active tenant configuration and actual generation results before advertising capabilities.

## Development browser checks

Default workspace preview selects Austin. For tenant-specific checks, map `eventcarpooling.com` and `*.eventcarpooling.com` to localhost in a dedicated browser and use HTTP through local port 80. Do not navigate to the HTTPS production hosts when verifying local changes.

In development, the public web server forwards both Host and X-Forwarded-Host to the shared port-80 proxy using native HTTP transport. In production it uses the platform's published HTTPS origin: the workspace's `localhost:80` proxy does not exist there. Keep the city Host intact in both cases. An explicit `INTERNAL_API_ORIGIN` is available for controlled tests or a verified alternative router.

When checking production readiness, test the default production API origin as well as the mock API override; an override can hide a broken production default.
