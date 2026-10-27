# IRL Group workspace

## Product and architecture

This pnpm monorepo powers IRL Group: a multi-tenant local-events platform with city editions, newsletters, admin tools, and the AustinCares deals directory. The canonical public domain is `irl.group`; new links, APIs, and canonicals must use it. Keep the legacy host only for intentional redirects or compatibility, and do not change the verified mail sender address as part of a domain migration.

- Runtime: Node.js 24, TypeScript 5.9, pnpm workspaces.
- API: Express 5 in `artifacts/api-server`.
- Public site: React/Vite SSR in `artifacts/austin-events`.
- Data: Replit-managed PostgreSQL through Drizzle in `lib/db`; development and production are separate environments.
- Object uploads: Replit Object Storage through the local sidecar in `artifacts/api-server/src/lib/objectStorage.ts`.
- Email: Titan SMTP for outbound app mail; Gmail IMAP for newsletter-source intake.
- AI: server-side OpenAI-compatible calls; verify Replit AI Integrations endpoint portability before any off-Replit run.

Other artifacts and workflows, such as the portfolio and mockup sandbox, are workspace tools and are not automatically part of the public production site.

## Host and tenant rules

The API resolves a city tenant from the incoming `Host` header. Production requests must preserve the original host through any reverse proxy; an unknown or inactive tenant must not silently fall back to another city. Development uses `DEFAULT_TENANT_SLUG` and can use `X-Tenant-Slug` only outside production.

The platform has a root hub and city subdomains. The migration checklist inventories 19 slugs; verify the active tenant rows and DNS records before treating that list as complete. Preserve both `irl.group` and `*.irl.group`, wildcard HTTPS, and all active city hostnames during any provider change. See `docs/irl-group-migration.md`.

## Data and operational safety

- Treat subscribers, city-request submissions, RSVPs, and community deal submissions as personal or user-provided data. Keep exports encrypted and outside Git.
- Never put secret values, bearer tokens, or database URLs in code, docs, logs, scripts, or commits. Record names only; use the Replit Secrets UI and the destination's secret manager for values.
- Do not assume development and production database IDs, records, or configuration match.
- Newsletter broadcasts require explicit user authorization. Test sends must target one approved recipient.
- Newsletter From settings are separate from page-domain changes.
- The API currently starts daily and weekly maintenance/refresh timers in each server process. Review `docs/irl-group-migration.md` before changing deployment topology or enabling jobs on a second host.

## Build and run

- `pnpm install --frozen-lockfile`
- `pnpm run typecheck`
- `pnpm run build`
- API development: `pnpm --filter @workspace/api-server run dev`
- Public site development: `pnpm --filter @workspace/austin-events run dev`
- API production start: `pnpm --filter @workspace/api-server run start`
- Public site production serve: `pnpm --filter @workspace/austin-events run serve`

The API requires `PORT` and `DATABASE_URL`. The API runs `runStartupMigration()` at startup; review that behavior before starting multiple instances against a new database. The web and API are separate services and need the correct proxy/API routing.

## Migration documentation

`README.md` is the short operator guide. `docs/irl-group-migration.md` contains the staged off-Replit inventory, backup, staging, DNS cutover, rollback, and post-cutover checklist. The procedure is documentation, not authorization to export data, transfer secrets, send newsletters, or change DNS.
