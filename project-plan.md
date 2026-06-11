# Raj's Austin Events — Project Plan

**Live at:** [eventcarpooling.com](https://eventcarpooling.com)
**First went live:** March 29, 2026
**Last updated:** June 11, 2026

---

## What It Is

A personalized weekly newsletter website for Austin events. The site aggregates events from multiple Austin newsletters via Gmail, curates them with AI assistance, and presents them on a public-facing digest page — complete with carpool coordination, email subscriptions, and an admin panel.

---

## Project Phases

### Phase 1 — Build & Launch *(March 28–29, 2026)*
**First public launch on March 29, 2026**

The full application was designed and built from scratch in a single sprint:

- Initialized monorepo with pnpm workspaces, TypeScript, and PostgreSQL
- Built the React + Vite frontend with landing page, digest view, and admin panel
- Built the Express 5 API server with OpenAPI spec and auto-generated client hooks
- Connected Gmail (IMAP) to read forwarded event newsletters as the event source
- Set up Drizzle ORM with `subscribers` and `digests` database tables
- Integrated Resend API for outbound email newsletters
- Added welcome emails for new subscribers
- Added ability to generate past newsletter editions (backfill)
- Deployed to production at **eventcarpooling.com**

---

### Phase 2 — User Engagement & Polish *(June 8–9, 2026)*

Focused on community features and UX quality:

- **Carpool RSVP system** — visitors can flag interest in carpooling to events; other subscribers are notified via email
- Admin endpoint to resend carpool notifications manually
- Consolidated carpool alert emails (one email per event, not per RSVP)
- Fixed newsletter subscription form on both homepage and digest pages
- Added anchor links to the subscribe section from digest pages
- Admin email notifications when new subscribers sign up
- Improved email error visibility and fallback handling
- Updated sender to personal email account
- Cleaned up past editions from the main landing page

---

### Phase 3 — Content Quality & Attribution *(June 10, 2026)*

Focused on trust, accuracy, and source transparency:

- Made event source citations **clickable links** to their originating newsletters
- Corrected and verified links for:
  - The Austin Business Review
  - Greater Asian Chamber of Commerce
- Fixed event description truncation (long descriptions now cut cleanly)
- Enforced **chronological ordering** of events on digest pages

---

### Phase 4 — New Sources & Featured Events *(June 11, 2026)*

Expanded coverage and added editorial curation:

- Added 3 new newsletter sources to the email parser:
  - **ATX Today** (6AM City) — pipe-separated format
  - **What's Weird ATX** — Luma-style with Austin flavor
  - **The Weekly Common** — parks, books & local culture
- Generated the **June 11–20, 2026 digest** from 4 email newsletters (23 events)
- Added **Featured Event** support — special gold/amber callout card pinned above the regular grid
- Featured the **Salesforce Trailblazer Community** "Think Before You Build" event (Jun 23 @ Bazaarvoice)
- Featured event shown on both the **landing page** and the **full digest page**
- Updated intro text to credit AI-assisted curation
- Added the **World Cup Watch Party** at Inn Cahoots (Jun 13)
- Pushed all changes live to production

---

## Software Stack

**Frontend**
- React 18 + Vite (TypeScript)
- Tailwind CSS + shadcn/ui component library
- Framer Motion (page animations)
- React Query (server state / API hooks, auto-generated via Orval)
- Wouter (client-side routing)
- date-fns + Lucide icons

**Backend**
- Node.js 24 + Express 5 (TypeScript)
- OpenAPI 3.1 spec → Orval codegen (generates typed React Query hooks + Zod schemas)
- Zod v4 (request/response validation)
- Drizzle ORM + PostgreSQL
- Gmail IMAP (event source ingestion)
- Resend API (email delivery)

**Infrastructure**
- Replit (hosting, secrets management, CI/CD)
- pnpm workspaces monorepo
- esbuild (API server bundler)
- Custom domain: eventcarpooling.com

---

## By the Numbers

| Metric | Count |
|--------|-------|
| **Lines of code** (core app, excl. UI library) | ~4,600 |
| **Lines of code** (total incl. UI components) | ~10,400 |
| **Times published to production** | ~39 |
| **Active newsletter sources** | 5 |
| **Events in current digest** | 23 |
| **API routes** | 12 |
| **Database tables** | 3 (subscribers, digests, rsvps) |
| **Project duration** | March 28 → June 11, 2026 (75 days) |

---

## Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `emailReader.ts` | Gmail IMAP + multi-format newsletter parser | 647 |
| `emailService.ts` | Resend email delivery (newsletters + carpool alerts) | 436 |
| `events.ts` | Digest generation and management API routes | 322 |
| `admin.tsx` | Admin panel (generate digests, manage subscribers) | 350 |
| `event-card.tsx` | Event card UI with carpool RSVP form | 299 |
| `openapi.yaml` | Full API contract (source of truth for codegen) | 361 |
