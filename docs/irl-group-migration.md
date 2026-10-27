# irl.group portability and migration runbook

**Purpose:** Keep a repeatable path to run irl.group away from Replit within one day if needed, without losing subscribers, city requests, or any active city subdomain. Preserve the public hub, city editions, object uploads, scheduled work, and email behavior.

**Review status:** This runbook captures the checklist attached on October 27, 2026 and compares it with the current workspace code/configuration. It does not mean a backup, export, host selection, migration, email send, or DNS change has been completed.

## 1. Confirmed project inventory

Treat code and Replit configuration as evidence about the workspace, not proof of live production settings. Re-confirm the active database, secrets, custom domains, DNS, and deployment settings immediately before migration.

| Area | Current workspace evidence | Migration consequence |
|---|---|---|
| Runtime and code | pnpm monorepo, Node.js 24, TypeScript 5.9; Express 5 API and React/Vite SSR site | Run the API and web site as compatible Node services; a static-only host cannot replace the API. |
| Replit hosting | `.replit` specifies the Autoscale deployment target | Verify which artifacts, domains, region, scaling limits, and deployment commands are actually attached in Deployments. Preview workflows are not proof of production configuration. |
| Domain routing | Canonical public host is `irl.group`; tenant resolution reads the request `Host` | Preserve the apex and wildcard host, TLS, and original host forwarding through the new proxy. |
| City host snapshot | Checklist lists `nyc`, `dallas`, `manchester`, `la`, `boston`, `atlanta`, `sanfrancisco`, `austin`, `sacramento`, `miami`, `houston`, `tokyo`, `osaka`, `stlouis`, `portland`, `bulverde`, `dc`, `austincares`, and `brushycreek` | This is a 19-slug snapshot, not a live tenant query. Compare it with active `tenants` rows and DNS records before cutover. |
| Database | PostgreSQL through `DATABASE_URL` and Drizzle; dev and production are separate | Export and restore each intended environment deliberately. Never infer matching IDs or data from a development copy. |
| Persistent tables | `tenants`, `digests`, `subscribers`, `city_requests`, `rsvps`, `submitted_deals`, `admin_otps`, `xp_ledger`, `earned_badges`, `weekly_challenges`, `challenge_progress`, and `streaks` | A migration must include all tables and relationships, not only digest JSON or subscribers. Review current schema before each export. |
| Personal data | Subscriber records, city-request submissions, RSVP records, and community deal submissions are stored in PostgreSQL | Export only for an authorized migration, encrypt at rest and in transit, keep outside Git/chat/logs, and verify deletion/retention of temporary copies. |
| Static assets | Tracked files include `artifacts/austin-events/public/images` and public content | Verify the Git remote contains every image, logo, Open Graph asset, and per-city AI Ethics reading/content file. |
| Object uploads | API storage uses Replit's local sidecar credentials and Google Cloud Storage client; paths are split between public and private object storage | This is Replit-bound integration code. Inventory and export objects, ACLs, metadata, and signed-link behavior; replace the sidecar integration before off-Replit traffic. |
| Admin access | City admin routes use application-managed password hashes and HMAC-derived tokens, with email-based admin tokens in some tenant cases; this is not Replit Auth | Preserve or intentionally rotate admin credentials and HMAC/session configuration. Test every admin path on staging without exposing tokens. |
| Outbound email | Titan SMTP is used for outbound app/newsletter mail | Confirm new-host SMTP egress, sender authentication, delivery logs, and provider settings. Preserve the verified From address unless separately approved. |
| Inbound newsletters | Gmail IMAP is used to read source newsletters | Confirm the new host can reach IMAP and that the mailbox credential/integration remains authorized. |
| AI/event sources | Server code uses OpenAI-compatible Replit AI Integration settings and event-source adapters | Do not assume Replit AI Integration credentials or proxy URLs work off-host. Select a portable provider endpoint and secret before staging. Confirm optional adapters individually. |
| Bot protection and SMS | Cloudflare Turnstile is used on public forms; Twilio is used for SMS flows | Add the new hostnames to the relevant provider settings and test only with authorized staging recipients. |
| Scheduled work | API startup launches an immediate daily cleanup, a daily 2 AM cleanup timer, a Sunday 4 AM cleanup timer, and a Sunday 6 PM weekly refresh timer | These timers run in each API process and use server-local time. A multi-instance host can run duplicate jobs. Move to a single scheduled worker/cron or add a proven distributed lock; confirm the current production timezone. |
| Analytics | No common analytics SDK marker was found in the scanned app source | Check Replit deployment settings, DNS, tag managers, email tools, and provider dashboards before declaring analytics absent. |

`artifacts/api-server/src/index.ts` also runs `runStartupMigration()` when the API starts. Review this routine before starting multiple instances against a restored database. Current API routes require `PORT`; the web/API services need explicit routing between them.

### Replit-specific dependencies to audit

Before a move, search the repository for `@replit/`, `replit.`, `REPLIT_`, `REPLIT_DB_URL`, `REPL_ID`, `.replit.dev`, `.repl.co`, and the object-storage sidecar endpoint. Current findings include:

- The Vite development overlay/plugins and `REPL_ID` checks are development tooling.
- Tenant resolution has Replit-host-specific development behavior; test new staging hosts and production host forwarding.
- Object storage uses a Replit sidecar and is not portable just by copying environment-variable names.
- `AI_INTEGRATIONS_OPENAI_BASE_URL` may point to a Replit-managed proxy. Verify it from the new host and replace it with a portable provider setup if necessary.

## 2. Phase 1 — Back up everything before migration work

Prioritize this baseline backup even if no migration is chosen. Do it as a separate, authorized backup exercise; later hosting and DNS phases are conditional on choosing to move. Do not put personal data or secret values in the repository.

- [ ] Create or verify a private GitHub/GitLab remote, connect it to the workspace, and confirm its access controls. Confirm the latest commit is pushed and includes source, static images, and per-city content. This workspace's local Git checkout alone does not prove the remote is current or private.
- [ ] Keep `.env*`, local database files, dumps, CSV exports, build output, `node_modules`, and Python cache files out of Git. Root `.gitignore` now includes baseline secret/database/export patterns; review it when adding new export formats.
- [ ] Scan tracked source/history for credentials before any new push. Move actual secrets into a secret manager; never copy values into code, skills, README, migration documents, logs, or chat.
- [ ] Export a full PostgreSQL dump from the correct environment. Label development and production separately; verify the dump can be listed and restored into a disposable database.
- [ ] Export subscriber and city-request records separately only if operationally needed. Include counts and timestamps, encrypt the files, store outside Replit and outside this repository, and restrict access.
- [ ] Inventory and export Replit Object Storage, including public/private objects, metadata, ACLs, and generated uploads. Verify archive counts and checksums.
- [ ] Record Replit deployment settings, `.replit` configuration, active artifact list, build/start commands, port mappings, hostnames, region, scheduled behavior, and any external callbacks/webhooks.
- [ ] Manually inventory secret **names** in the Replit Secrets UI and code. Transfer values directly between approved secret managers; record the transfer date and destination without copying values into Git. The agent must not read or reproduce secret values.
- [ ] Store database, subscriber, request, and object-storage backups in encrypted storage outside Replit and outside Git.
- [ ] Set a recurring backup cadence (weekly is the checklist's baseline) and run a restore test at least quarterly.

## 3. Phase 2 — Complete the portability inventory

Before selecting a host, fill in every item marked **Confirm** from the live workspace/provider dashboards:

- [ ] Replit deployment type, artifacts served, region, scaling behavior, health checks, custom-domain bindings, and current production build.
- [ ] DNS provider, apex and wildcard records for `irl.group` / `*.irl.group`, TTL, registrar access, wildcard certificate issuance and renewal.
- [ ] Active tenant slugs from PostgreSQL and the exact set of public hostnames; reconcile against the 19-slug snapshot above.
- [ ] Production and development PostgreSQL identities, extensions, migrations, table row counts, indexes, and backup/restore procedure.
- [ ] City-request and subscriber storage, export owners, consent/unsubscribe state, and any external provider lists that are authoritative.
- [ ] Newsletter provider setup, sender authentication, suppression/bounce state, scheduled deliveries, callbacks, and webhooks. Current code uses Titan SMTP for outbound and Gmail IMAP for intake.
- [ ] AI model/provider endpoint, billing owner, usage limits, keys, and whether Spock research/drafting is called only by API requests or by an external scheduler. No separate Spock cron was identified in the checked app code.
- [ ] Every scheduled job, its time zone, owner, retry/idempotency behavior, and whether Replit autoscale can run more than one copy. Current timers use server-local time.
- [ ] Admin login, tenant-specific credentials, email/HMAC paths, sessions, RSVP signing, and any external SSO. The checked code uses app-managed admin auth rather than Replit Auth.
- [ ] Object-storage bucket inventory, approximate size, public/private ACLs, signed URLs, and which object paths are referenced from database rows or newsletters.
- [ ] Required environment-variable names and current secret count. The name inventory below is code-derived, not proof that every variable is currently configured.
- [ ] Analytics, captcha allowlists, SMS providers, API rate limits, and any provider dashboards not visible in the repository.
- [ ] Search code and build configuration for Replit-only hosts, packages, storage, environment variables, and sidecars; record the replacement for each.

## 4. Phase 3 — Choose a replacement stack

The attached checklist offered GitHub (with GitLab as an alternative); Claude Code or Cursor (with Lovable, Bolt, or continuing to use Replit as alternatives); Render, Railway, or Fly.io; Neon or host-managed PostgreSQL (with Supabase as an alternative); Cloudflare or the current registrar for DNS; Render Cron or GitHub Actions for scheduled jobs; and repository assets plus Cloudflare R2 or S3 for storage. Vercel was listed only if the app architecture fits a static or Next.js deployment. These are options, not a user-approved architecture. No replacement host or database provider has been selected.

Compare options against the actual system:

- Supports two Node services (Express API and React/Vite SSR site), the required ports, reverse-proxy headers, and the root plus wildcard custom domains.
- Issues and renews wildcard HTTPS certificates; supports the necessary DNS verification method.
- Runs PostgreSQL with tested backup/restore and reliable import of the current schema/data.
- Provides a durable secret store and adequate region/data-handling controls.
- Supports object storage with the required public/private ACL and signed-URL behavior.
- Permits required SMTP/IMAP, Twilio, AI-provider, and event-source egress.
- Provides a single-owner cron/scheduler or a tested distributed lock, logs, health checks, and rollback controls.
- Meets the expected budget. Compare monthly cost with current Replit usage.

Coding-tool choice is separate from the production runtime. Do not select a static-only host for the complete app unless the API and server-rendered routes are hosted elsewhere and the routing is tested.

## 5. Phase 4 — Build and test a parallel staging environment

Keep Replit live; use a separate staging database and temporary host. Do not point production DNS or run subscriber sends during this phase.

- [ ] Deploy the same reviewed Git commit to the candidate host. Use `README.md` commands as a starting point; `.replit` preview workflows alone are not a complete production deployment specification.
- [ ] Restore a sanitized or encrypted authorized database snapshot to a separate staging database. Verify table counts and relationships before enabling writes.
- [ ] Add secrets directly through the destination's secret manager. Replace Replit-only storage and AI proxy integrations; do not copy Replit sidecar credentials or secret values into files.
- [ ] Import object assets and verify public/private access, image URLs, map pins, Open Graph images, and email image rendering.
- [ ] Keep scheduled jobs disabled initially. Manually verify each job against staging; ensure only one scheduler will be active at a time.
- [ ] Verify the hub and every active city edition. If wildcard DNS is not yet live, use a host override that preserves the expected `Host` header.
- [ ] Verify unknown tenant hosts return the intended error, while all active slugs resolve to the correct city. Confirm canonical URLs use `irl.group`, not a temporary or Replit host.
- [ ] Verify the city-request form, newsletter signup/unsubscribe, RSVPs, AustinCares submissions, admin login, and any SMS path without sending to real subscriber lists.
- [ ] Run one authorized AI/event-drafting job manually on staging; verify it produces a draft and does not trigger a production email.
- [ ] Test a single email only to an explicitly approved test recipient. Never use a staging test as authorization for a subscriber broadcast.
- [ ] Compare row counts for all application tables and check representative records, persistent event IDs, signed RSVP behavior, and newsletter unsubscribe state.
- [ ] Check logs, error responses, performance, provider egress, time zone, and restore procedure on the candidate host.

## 6. Phase 5 — DNS and subdomain cutover

Cutover is an externally visible production change and requires explicit user approval at the time of execution.

- [ ] Choose a quiet window that is not immediately before a newsletter send. Record the rollback owner and current DNS values.
- [ ] Lower apex and wildcard DNS TTL in advance (the checklist suggests five minutes) and allow the old TTL to expire.
- [ ] Add `irl.group` and `*.irl.group` to the new host and complete ownership verification. Confirm wildcard TLS issuance, renewal, and HTTPS redirects before switching traffic.
- [ ] Freeze writes on Replit: pause city requests, subscriber changes, RSVPs, deal submissions/admin edits, newsletter changes, and scheduled jobs.
- [ ] Take a final database export and final object-storage delta after writes stop. Verify counts/checksums, import into the new database, and compare before traffic moves.
- [ ] Ensure Replit's scheduler is stopped before enabling the new host's scheduler. Avoid split-brain jobs and duplicate newsletters.
- [ ] Point apex and wildcard DNS at the new host. Preserve the original `Host` header through proxying so tenant resolution remains correct.
- [ ] Smoke-test the hub and every active subdomain over HTTPS. At minimum include Tokyo and AustinCares plus five other cities; the complete host sweep remains required.
- [ ] Verify city navigation, public HTML, API routing, images, maps, signups, unsubscribe, city requests, admin login, and one test-only email path.
- [ ] Update Turnstile allowed hostnames and provider callback/webhook URLs. Verify newsletter and analytics provider settings without changing the verified From address.
- [ ] Enable the new scheduled jobs only after the data, hostnames, and logs are verified.
- [ ] Keep the Replit deployment running but unlinked for one to two weeks as a rollback option. Track any writes on the new host so they can be reconciled if DNS is rolled back.

## 7. Phase 6 — Monitor and maintain

- [ ] Review error logs, health checks, signups, city requests, and data counts daily for the first week.
- [ ] Confirm each city's next scheduled newsletter follows its expected local schedule; test provider acceptance and failures. Do not claim inbox delivery from SMTP acceptance alone.
- [ ] Keep backups enabled on the destination host and verify an automated restore at least quarterly.
- [ ] Rotate credentials that were available to the Replit deployment only after the new host is verified and the old deployment is shut down. Do not revoke credentials early enough to break rollback.
- [ ] End the rollback window only after the user approves. Then decide whether to cancel or downgrade Replit; do not do so automatically.
- [ ] Make the verified Git remote the source of truth: every code change from every tool ends in a reviewed commit.
- [ ] Keep `README.md` current with build/run commands, environment-variable names (never values), and DNS requirements.

## 8. Code-derived environment-name inventory

Names below come from workspace source/configuration scans. Confirm actual enabled values and provider ownership in Replit's secret/configuration UI. This list intentionally contains no secret values.

| Use | Names to check |
|---|---|
| Runtime/database | `PORT`, `NODE_ENV`, `DATABASE_URL`, `LOG_LEVEL` |
| Tenant/admin/session | `DEFAULT_TENANT_SLUG`, `VITE_TENANT_SLUG`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `RSVP_HMAC_SECRET`, `OSAKA_ADMIN_EMAIL` |
| Email intake/outbound | `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `TITAN_SMTP_HOST`, `TITAN_SMTP_PORT`, `TITAN_SMTP_USER`, `TITAN_SMTP_PASSWORD`, `FROM_NAME` |
| AI and event sources | `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`, `TICKETMASTER_API_KEY`, optional `BANDSINTOWN_APP_ID`, `EVENTBRITE_TOKEN`, `LUMA_API_KEY`, `SONGKICK_API_KEY` |
| Object storage | `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS`, and the default bucket configured in Replit's `.replit` object-storage section |
| Bot protection/SMS | `TURNSTILE_SECRET_KEY`, public `VITE_TURNSTILE_SITE_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |
| Other behavior | `ADULT_CONTENT_BLOCKLIST_EXTRA` |

Do not copy this table's names as proof that all providers are enabled. `VITE_TURNSTILE_SITE_KEY` is public browser configuration; secret keys and passwords must stay in secret stores.

## 9. Open items before calling the platform migration-ready

- Is the Git remote private, current, and complete, including all public images and city-specific content?
- What are the live DNS provider, exact records/TTL, custom-domain bindings, and wildcard certificate renewal process?
- What are the current production/development database identities, row counts, backup locations, and successful restore evidence?
- Which active tenant slugs exist in production today, and are all 19 checklist hostnames still active?
- What objects and ACLs exist in each storage bucket, and how will old object URLs continue to resolve?
- What time zone does the current production server use for its in-process timers? Are any scheduled jobs configured outside this code?
- Does Spock run only from API actions, or is there an external scheduler not represented in the repository?
- Which analytics tools or external callbacks are configured outside the code?
- Which destination host and region meet wildcard-domain, database, storage, scheduled-job, email-egress, and budget requirements?
