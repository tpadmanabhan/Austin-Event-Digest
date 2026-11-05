---
name: alumni-tenant-rollout
description: "Plan or launch an IRL Group tenant for an alumni association, cohort, or professional community. Use for organization-based tenants modeled on Leadership Austin, not for a one-off event edit or a geographic city guide."
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
