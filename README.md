# IRL Group

IRL Group is a multi-tenant local-events platform with city editions, weekly newsletters, admin tools, and the AustinCares deals directory. Its canonical domain is `irl.group`; the public app uses city subdomains resolved from the request `Host`.

## Stack

- pnpm monorepo, Node.js 24, TypeScript 5.9
- Express 5 API: `artifacts/api-server`
- React/Vite SSR site: `artifacts/austin-events`
- PostgreSQL + Drizzle: `lib/db`
- Replit Object Storage for uploads; static site assets live under `artifacts/austin-events/public`
- Titan SMTP for outbound mail; Gmail IMAP for newsletter-source intake

## Common commands

```sh
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run build

pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/austin-events run dev

pnpm --filter @workspace/api-server run start
pnpm --filter @workspace/austin-events run serve
```

The API and web site are separate services. The API requires `PORT` and `DATABASE_URL`; production must route API requests to the API service and preserve the original host for tenant resolution.

## Configuration names

These are names only, not values. Confirm which are currently enabled before deployment:

- Core: `DATABASE_URL`, `PORT`, `NODE_ENV`, `LOG_LEVEL`
- Tenant/development: `DEFAULT_TENANT_SLUG`, `VITE_TENANT_SLUG`, `OSAKA_ADMIN_EMAIL`
- Admin, sessions, and signed actions: `ADMIN_PASSWORD`, `SESSION_SECRET`, `RSVP_HMAC_SECRET`
- Forms and bot protection: `TURNSTILE_SECRET_KEY`, `VITE_TURNSTILE_SITE_KEY`
- Outbound mail: `TITAN_SMTP_HOST`, `TITAN_SMTP_PORT`, `TITAN_SMTP_USER`, `TITAN_SMTP_PASSWORD`, `FROM_NAME`
- Newsletter-source intake: `GMAIL_USER`, `GMAIL_APP_PASSWORD`
- AI and event sources: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`, `TICKETMASTER_API_KEY`; optional adapters also read `BANDSINTOWN_APP_ID`, `EVENTBRITE_TOKEN`, `LUMA_API_KEY`, and `SONGKICK_API_KEY`
- SMS: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Replit storage configuration: `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS`, and the default bucket configured in `.replit`
- Optional filtering: `ADULT_CONTENT_BLOCKLIST_EXTRA`

`VITE_TURNSTILE_SITE_KEY` is a public browser setting; `TURNSTILE_SECRET_KEY` is not. Never put secret values, `.env` files, database URLs, or data exports in Git. Use the platform's secret store and a destination secret manager.

## Domain and data

Keep the apex `irl.group` and wildcard `*.irl.group` available with valid HTTPS. The migration checklist's 19 city slugs are a snapshot; verify them against the active `tenants` rows and DNS before a cutover. Do not change the verified outbound email sender as part of a web-domain change.

The database contains tenant, digest, subscriber, city-request, RSVP, submitted-deal, admin-OTP, and gamification data. Subscriber and city-request exports contain personal data: encrypt them, store them outside this repository, and delete temporary copies according to the approved retention plan.

## Portability

This local Git checkout does not by itself prove that a private remote is configured or current. Before treating Git as the source of truth, verify the remote, access controls, branch, latest commit, static assets, and per-city content.

See [`docs/irl-group-migration.md`](docs/irl-group-migration.md) for the reviewed migration inventory and staged backup, staging, cutover, rollback, and recovery checklist. No hosting provider or replacement stack has been selected.
