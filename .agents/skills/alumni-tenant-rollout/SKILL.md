---
name: alumni-tenant-rollout
description: "Plan organization-based alumni/cohort tenants or manage Leadership Austin class profiles. Use for cohort subdomain rollouts or profile updates, not for a one-off event edit or a geographic city guide."
---

# Alumni and Cohort Tenant Rollouts

Use this for a new organization-based community tenant or a substantial adaptation of one. For a single event correction, newsletter edit, or send, use `digest-workflow` instead.

## Start with the tenant model

Confirm the organization's public name, slug, audience, public/private boundaries, administrators, event sources, attribution wording, time zone, service area, and approved calls to action. A cohort may be distributed across cities; do not assume that Austin's timezone, map, event adapters, or city-wide content defaults fit.

Use `tenant-routing` for hostname resolution, tenant configuration, and publication. Use `admin-api-auth` for target-environment admin access. Do not infer that a new production domain or email sender is configured merely because a tenant row exists.

## Leadership Austin: example and limits

Leadership Austin demonstrates a persistent event feed alongside the weekly digest:

- Events have stable records in `leadership_events` and an explicit alumni-source attribution (`source_alumni` in storage, `sourceAlumni` in API data).
- The current API family is `/api/events/leadership-managed`; its admin list, public list, create, source-update, and archive routes are restricted to the `leadershipaustin` slug.
- The feed is assembled independently of the weekly digest array and is added to the Leadership Austin email preview and send at render time. Do not copy these events into `digests.events` as well.
- Its page and email presentation have Leadership Austin-specific branding and copy. The email's WhatsApp CTA is also specific to that group.
- The current feed resolver uses Austin's tenant, time zone, and geocoding behavior.

These are not tenant-provisioning defaults. A new group will not get this feed by inserting a tenant or event row. Before onboarding another group, decide whether to generalize the persistent event model and tenant configuration; avoid expanding one-off slug checks. Keep attribution and community links specific to the organization and never reuse another cohort's contact or invite link.

## Manage class profiles on the existing Leadership Austin site

The existing Leadership Austin admin page can add class-profile cards within the current `leadershipaustin` tenant. This does not provision a new cohort site. Use it only when the requested change is to add or edit a profile on the existing Leadership Austin site:

1. Open **Admin → Settings → Leadership Austin class profiles** and select **Add class**.
2. Enter a unique class name and class rep name. Add the rep's LinkedIn profile and cohort WhatsApp/LinkedIn links only when verified for that cohort.
3. Upload the class image and rep portrait when available. The admin editor accepts JPG, PNG, WEBP, or GIF up to 4 MB; it stores the resulting object paths. Do not copy another cohort's private invitation or contact links.
4. Select **Save class profiles**. The saved profile list is capped at 20 entries, requires at least one profile, and requires both names for every profile.
5. Verify the new profile on the Leadership Austin landing page, a full edition, and the newsletter preview if the email is in scope. Confirm image URLs load and existing cohorts remain present.

Class name, rep name/photo, class photo, and group links are shared profile fields rendered from the tenant's saved `leadershipClassProfiles`. Keep them consistent across the landing page, full edition, and email. Full-edition-only event or edition content must remain on that surface; do not copy it onto the landing page just to make pages look alike.

If editing through the admin API instead of the UI, first read the current profile array, append or edit only the intended profile, and send the complete preserved array to `PATCH /api/admin/settings` as `leadershipClassProfiles`. Each entry needs a unique nonempty `id`, `className`, `classRepName`, `classRepLinkedInUrl`, `teamWhatsAppUrl`, `teamLinkedInUrl`, `classPhotoUrl`, and `classRepPhotoUrl`; unused links should be empty strings and unused photos should be `null`. The route validates 1–20 entries and unique IDs. Use `admin-api-auth` for the correct environment and never write profiles directly to the database.

## Provision a new Leadership cohort site

Future Leadership cohorts are separate organization tenants with their own subdomains under `irl.group`, following the subdomain setup pattern used for City IRLs. Do not treat a new cohort as another profile on the existing `leadershipaustin` tenant, and do not assume it inherits Leadership Austin's events, admin access, links, email identity, or settings.

The self-service intake page for new cohorts has not been set up. Do not link to it or tell applicants/admins that they can submit a cohort there. Until that page exists, confirm the cohort details and the approved intake/provisioning path directly before creating a tenant. Then follow the Rollout workflow below, including tenant-scoped auth, subdomain configuration, and checks in both development and production. Use `tenant-routing` for host setup and `admin-api-auth` for target-environment admin access.

## Rollout workflow

1. **Define scope and ownership.** Confirm who can submit events, who approves them, how public the records are, the canonical source, how contributors should be credited, and which locations may be shown on a map. Do not publish private RSVP-only addresses or imply that an event is endorsed by the organization without evidence.
2. **Configure the tenant.** Choose a stable slug, display name, domain, email title/sender identity, locale, time zone, and authentication pattern. Keep city-only defaults out of an organization tenant unless requested. Resolve the tenant from its production host and check each environment independently.
3. **Choose event storage deliberately.** Use the weekly digest for edition-specific curation. Use a persistent feed only when records should remain current across editions and need stable identity, an active/archive lifecycle, provenance, source-person attribution, and appropriate deduplication. Keep these models distinct and avoid duplicate rendering.
4. **Generalize the whole feature.** Add the tenant's scoped API and admin controls, public landing/full-edition views, and email preview/send integration. Tenant branding, copy, source labels, and WhatsApp or other group links should come from tenant configuration where possible, not another group's hard-coded values.
5. **Protect tenant boundaries.** Verify that reads and writes are scoped by both record ID and tenant ID. Check that a second organization cannot see or edit the first organization's events, attribution, RSVP records, or invite links. Use authenticated APIs for production data writes; do not write directly to the production database.
6. **Verify every surface.** Check the target tenant's landing page, full edition, map or location behavior if enabled, admin editing flow, and authenticated email preview. Confirm source credit, date/time zone, organizer links, CTA destinations, tenant branding, and that no development or wrong-tenant URLs appear.
7. **Test before broad delivery.** Add regression coverage for the new tenant and at least one existing city/organization tenant. Use the digest workflow's `testEmail` field for a specifically requested one-recipient preview. A test send is not approval to send to subscribers; require explicit authorization for a broadcast.
8. **Publish and verify production.** Code/template changes need publication; authenticated data-only writes do not. After publishing, verify the production host, event feed, and email preview. Preserve historical editions and send metadata.

## Reusable email rules

- Render persistent organization events in both authenticated preview and send paths if the newsletter is supposed to include them; do not verify only the public page.
- Display contributor attribution from the saved event record, with a clear fallback only if the product approves one.
- Treat a group invitation link as tenant-owned content. Verify the URL and label for that organization before adding it to email or pages.
- Before a draft send, confirm the intended tenant, latest edition ID, subject, date range, intro, event content, spotlights, and recipient. Send only with `testEmail` for the named address; never omit it or add `confirm: true` for a draft.
- Confirm provider acceptance and re-read `sentAt`/`sentCount`. A test email should not mark the subscriber edition as sent.

For send checks, use `.agents/skills/digest-workflow/SKILL.md` and its reference on reviewed newsletters to named recipients. For production writes, use `.agents/skills/push-to-production/SKILL.md`.
