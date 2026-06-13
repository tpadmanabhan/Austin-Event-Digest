# Threat Model

## Project Overview

Raj's Austin Events is a public newsletter website with a React frontend and an Express API backed by PostgreSQL. Public users can browse digests, subscribe by email, and use a carpool RSVP flow. A separate admin experience can generate weekly digests from Gmail-sourced content, inspect subscribers, and send newsletters to the full mailing list. The highest-risk production concerns are the browser-to-API boundary, the public-to-admin boundary, and workflows that read or email subscriber data.

## Assets

- **Subscriber directory** — subscriber email addresses, names, subscription status, and timestamps. Exposure enables privacy harm, scraping, and targeted spam.
- **Newsletter sending capability** — the ability to send digest or notification emails through Resend or Gmail SMTP. Abuse would damage sender reputation and turn the app into a spam relay.
- **Digest content and history** — stored digests are business content and also the basis for outbound emails and RSVP links. Unauthorized modification or deletion would disrupt operations.
- **Mail credentials and provider secrets** — `RESEND_API_KEY`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, and `DATABASE_URL` allow outbound email or direct data access if exposed.
- **RSVP participant data** — names, email addresses, event interest, and timestamps reveal attendance intent and social activity.

## Trust Boundaries

- **Browser to API** — all client input is untrusted. The server must validate and authorize every privileged action regardless of what the frontend labels as admin-only.
- **Public to admin** — digest generation, digest sending, digest deletion, and subscriber-list access are higher-privilege functions and must be protected server-side.
- **API to PostgreSQL** — API handlers can read and write subscriber, digest, and RSVP data. Broken access control at the route layer becomes direct data exposure or tampering.
- **API to external mail services** — the server can send mail through Resend or Gmail SMTP. Any route that reaches these code paths is effectively a high-impact capability.
- **API to Gmail/IMAP** — digest generation may read a Gmail inbox when configured. That path handles third-party content and must not be exposed to unauthorized callers.

## Scan Anchors

- Production server entry points: `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/*.ts`
- Public client routes: `/`, `/digest/:id`, `/rsvp` in `artifacts/austin-events/src/App.tsx`
- Admin-intended client route: `/admin` in `artifacts/austin-events/src/pages/admin.tsx`
- Highest-risk server code: `artifacts/api-server/src/routes/newsletter.ts`, `artifacts/api-server/src/routes/events.ts`, `artifacts/api-server/src/routes/rsvp.ts`, `artifacts/api-server/src/lib/emailService.ts`, `artifacts/api-server/src/lib/emailReader.ts`
- Dev-only area usually out of scope: `artifacts/mockup-sandbox/**`

## Threat Categories

### Spoofing

The application currently relies on public HTTP requests for both normal users and admin-intended operations. Any privileged route must require a server-validated admin identity; frontend-only placement under `/admin` is not a security control. RSVP actions must not trust a claimed email address from a URL parameter or request body as proof of identity.

### Tampering

Unauthenticated users must not be able to create, delete, or send digests, and must not be able to trigger outbound emails to the subscriber base. Digest generation and deletion are state-changing operations with business impact and must be restricted and auditable.

### Information Disclosure

Subscriber lists, RSVP participant details, and any other mailing-list-derived data must be disclosed only to authorized administrators or to the minimum intended audience. Public APIs and logs must not expose subscriber PII, mail credentials, or internal error details.

### Denial of Service

Public endpoints that send email or perform expensive inbox/database work must resist abuse. Routes that fan out to many outbound emails or invoke Gmail reads are especially sensitive because an unauthenticated caller could exhaust provider quotas or disrupt newsletter operations.

### Elevation of Privilege

The central privilege boundary in this project is between public visitors and newsletter operators. The system must enforce admin-only actions on the server, use parameterized database access, and avoid letting user-controlled inputs unlock access to subscriber data or mail-sending capabilities.