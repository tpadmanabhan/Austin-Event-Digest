# Platform maintenance

Use for the EventCarpooling root landing page, its city-request flow and shared branding. Read current code before relying on the entry points below.

## City requests are review requests, not automatic city launches

- Keep the root platform separate from city tenants. A request for a city and contact email records an application for manual review; it does not create a live tenant, subscribe that person, or grant admin access.
- Route the platform's header, hero and footer launch actions to the same request dialog. Preserve keyboard focus, Escape/close behavior, labels, validation, mobile layout and sticky-header anchor clearance.
- Save the request before treating email notifications as complete. Distinguish persistence, admin notification and requester acknowledgement; failure or uncertainty in one email must not erase a saved request or be presented as a successful city launch.
- Validate the response contract, including `saved`, `notificationStatus` and `acknowledgementStatus`. Optional acknowledgement status from an older server means unconfirmed, not sent. SMTP acceptance does not guarantee inbox placement.
- Protect against duplicate submissions in the UI and persistence layer. Check concurrent identical requests, network timeout, provider timeout, failure and dialog reopen while pending.
- Claim notification attempts atomically. An unknown outcome may already have reached the provider: do not blindly retry it or resend successful notifications. Keep the saved receipt visible and explain uncertainty honestly.
- Do not send real request notifications as a routine test. Mock providers or use explicitly authorized test recipients; do not click forms during a read-only public audit.

Current entry points: `src/components/launch-city-modal.tsx`, API `src/lib/cityRequests.ts`, `src/routes/cityRequests.ts`, the city-request OpenAPI contract and focused route/integration/browser tests.

## Contract and regression checks

- Update the OpenAPI schema before regenerating request/receipt client and validation types. Preserve the distinction between server persistence and email-service acceptance.
- Rebuild shared TypeScript project references after schema/codegen changes; a consumer typecheck may otherwise read stale declarations.
- Test doubles for the request service should cover durable claims and transaction/concurrency behavior, not only a successful email call.
- Reset-only Vitest hooks must return void. Returning a mock from a concise arrow hook can accidentally register it as cleanup and fail after otherwise passing tests.
- Run focused server tests, frontend typechecking and the applicable request-dialog browser checks. Verify retry behavior without creating duplicate emails.

## Branding, cities and published documents

- Keep Spock's transparent mascot and AI-assistant role consistent across the platform launch area, dialog, About page and readable public HTML. Preserve the distinction between Spock, human curators and organizers; do not invent attendance or transport guarantees.
- Use a shared city order for quick links and the larger live-city card listing. Count only cities when applying a requested ordinal position; preserve unrelated badges and city availability checks.
- For NEW labels and named-recipient newsletters, follow the digest workflow's [city pages and targeted sends](../../digest-workflow/references/city-pages-and-targeted-sends.md).
- For no-JavaScript content, loading-state handoff, script-failure recovery, tenant identity and city-specific OG/Twitter images, follow [public-page checks](../../verify-ai-readable-pages/references/eventcarpooling.md).
- Check the actual platform-root host and representative city hosts. A default development city preview is not the platform landing page.
- Distinguish local completion, published code and live data. Obtain current deployment information and verify the published response after user-approved publication.
