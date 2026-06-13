# Workspace

## Overview

pnpm workspace monorepo using TypeScript. This is "Raj's Austin Events" — a personalized weekly newsletter website about Austin events.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Email**: Resend API (requires RESEND_API_KEY secret)

## Features

1. **Landing page** with email subscription form and latest digest preview
2. **Digest page** — view individual weekly digests with event cards
3. **Admin panel** at `/admin` — generate new digests, manage subscribers, send newsletters
4. **Email newsletters** via Resend (configure RESEND_API_KEY env var)

## Environment Variables

- `RESEND_API_KEY` — API key from resend.com for sending emails
- `FROM_EMAIL` — The "from" email address (defaults to newsletter@rajsaustinevents.com)
- `FROM_NAME` — The sender name (defaults to "Raj's Austin Events")
- `DATABASE_URL` — Auto-provided by Replit PostgreSQL
- `RSVP_HMAC_SECRET` — Secret key used to sign RSVP email links (prevents link forgery). Generate with: `openssl rand -base64 32`. When not set, the email-link RSVP flow is disabled.

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── austin-events/      # React + Vite frontend website
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
└── ...
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/austin-events` (`@workspace/austin-events`)

React + Vite frontend. Pages: Home, Digest view, Admin panel.

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes:
- `GET /api/healthz` — health check
- `POST /api/newsletter/subscribe` — subscribe to newsletter
- `POST /api/newsletter/unsubscribe` — unsubscribe
- `GET /api/newsletter/subscribers` — list subscribers (admin)
- `GET /api/events/digest/latest` — get latest digest
- `GET /api/events/digest/list` — list all digests
- `POST /api/events/digest/generate` — generate new digest (admin)
- `POST /api/events/digest/send` — send digest to subscribers (admin)

### `lib/db` (`@workspace/db`)

Database layer. Tables: `subscribers`, `digests`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec. Run codegen: `pnpm --filter @workspace/api-spec run codegen`

## Email Setup

To enable email sending, set the `RESEND_API_KEY` secret in your environment:
1. Sign up at resend.com (free)
2. Create an API key
3. Add `RESEND_API_KEY` to your Replit secrets
4. Optionally set `FROM_EMAIL` to your verified domain email

Without the key, the app works fully but emails won't be sent.

## Gmail / Event Source Integration (PENDING)

Events are sourced from: `aiimplementationclubaustin@gmail.com`

The Gmail OAuth integration (connector:ccfg_google-mail_B959E7249792448ABBA58D46AF) was not yet authorized.

**To complete this:** Either:
- Option A: Re-authorize the Gmail OAuth connector via Replit integrations, OR
- Option B: Generate a Gmail App Password at myaccount.google.com/apppasswords and add these secrets:
  - `GMAIL_USER` = `aiimplementationclubaustin@gmail.com`
  - `GMAIL_APP_PASSWORD` = the 16-character app password

The IMAP email reader code is in `artifacts/api-server/src/lib/emailReader.ts`.
Once credentials are set, digest generation will auto-read newsletters from that inbox.
