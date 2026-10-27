---
name: irl-group-migration
description: Prepare, review, and verify an off-Replit migration of the IRL Group multi-tenant platform. Use when exporting its data, replacing Replit services, staging a new host, changing DNS, or planning rollback.
---

# IRL Group migration

Read `docs/irl-group-migration.md` and the root `README.md` before migration work. The runbook contains the current verified inventory, the full staged checklist, and facts that still require confirmation.

The readiness goal is a repeatable path to run irl.group away from Replit within one day if needed, without losing subscribers, city requests, or active city subdomains. Complete baseline backups even if no host change is selected.

## Safety and scope

- A checklist review or staging plan does not authorize data exports, secret transfers, newsletter sends, production database writes, or DNS changes.
- Keep development and production databases separate. Before a restore or cutover, create and verify a recoverable backup of the correct environment.
- Subscriber, city-request, RSVP, and deal-submission data is sensitive. Keep exports encrypted and outside Git, chat, logs, and reusable scripts.
- Never read, print, commit, or place secret values in skills or docs. Use the platform secret UI and the destination's secret manager to transfer values directly.
- The target stack is undecided. The provider examples in the PDF are options, not user approval.

## Migration order

1. Verify the private Git remote, full content, `.gitignore`, secret scan, and off-platform backups.
2. Inventory active tenants, tables, object storage, custom admin auth, email/AI/event providers, callbacks, analytics, and every scheduled job.
3. Choose a host that supports Express + SSR, PostgreSQL restore, wildcard `irl.group` domains/TLS, object storage, required network egress, and a single-owner scheduler.
4. Build a parallel staging copy with a separate database; keep scheduled jobs disabled until tested.
5. Compare records, images, host-based tenant routing, forms, admin access, provider integrations, and a single approved test email.
6. Only with explicit cutover approval, freeze writes, take a final export, switch apex and wildcard DNS, smoke-test every active city, then enable one scheduler.
7. Keep Replit available for the rollback window, monitor all cities and data flows, and do not retire the old host or rotate its credentials until rollback is no longer needed.

## Project-specific constraints

- `irl.group` is canonical. Preserve the apex and wildcard city subdomains, original `Host` forwarding, and the verified outbound mail sender.
- The app uses PostgreSQL/Drizzle, Replit Object Storage sidecar access, Titan SMTP, Gmail IMAP, custom tenant admin authentication, and Replit AI Integration settings. Treat the storage sidecar and AI proxy as Replit-bound until a replacement is tested.
- The API starts daily cleanup and Sunday cleanup/refresh timers in each process; these use server-local time. Prevent duplicate workers on multi-instance hosts and confirm the current production time zone.
- The checklist's 19 tenant slugs are a snapshot. Reconcile with active production tenant rows and DNS before cutover.

For tenant-resolution details, also read the `tenant-routing` skill. For city newsletter content or sending, use `digest-workflow`; migration approval never authorizes a subscriber broadcast.
