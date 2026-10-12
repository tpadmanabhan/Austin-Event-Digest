# AI events in city editions

## Standing default

Future city event-site and newsletter prompts include verified local AI events labeled **Tech**, without requiring the user to request AI events separately. Apply this when launching a new city or generating, curating, or refreshing an existing city's edition. Follow an explicit user restriction if it excludes these events.

**Why:** The user requested AI events in future city prompts after adding AI listings to San Francisco. General science events and AI Ethics readings are not substitutes for actual AI meetups, talks, workshops, hackathons, or conferences.

This is an agent-curation instruction, not a claim that the scheduled backend generator automatically researches AI events. Do not assume a successful generation or import satisfies it.

## Research and selection

1. Establish the intended city/metro area, edition, inclusive calendar range, and city-local time zone.
2. Actively search for relevant AI events using organizer calendars and official registration pages: local AI communities, universities, developer groups, AI companies, Luma, Meetup, Eventbrite, or equivalent local sources. Use search engines and aggregators for discovery, then verify each candidate on its organizer or official registration page.
3. Prefer in-person local events with registration available. Include multiple relevant AI events when verified options exist; there is no fixed quota. Clearly disclose approval requirements, audience restrictions, ticket costs when verified, registration deadlines, and waitlist-only status. Do not present sold-out or waitlisted events as openly available.
4. Verify the year, weekday, full local start/end, city, venue, official link, and image. For Luma, compare visible copy with its Event JSON-LD, retaining verified timestamps and UTC offsets. Aggregators may show UTC dates; never copy them as local dates. A midnight ending belongs to the next calendar day in `endDate`.
5. Include only events inside the user's requested date range and geographic scope. Do not import another city's AI events simply to fill the list. Do not guess private addresses or exact map pins. If using an organizer-published approximate area, explicitly label it approximate.

If no qualifying AI events can be verified, briefly report that outcome and the sources checked. Never invent events, substitute generic science listings, or silently skip the research.

## Add safely

- Deduplicate against existing listings by organizer link and title/date.
- Set `category: "Tech"`; do not create an `AI` category or categorize an AI event as a community spotlight merely because a community organizes it. Use `featured: false` for new regular listings unless the user requests Special labeling.
- Store verified `startDate`, `endDate`, `timezone`, and `venueAddress` when available. Use an absolute organizer image URL and verify that it responds successfully with an image content type. Missing verified optional metadata must remain missing rather than fabricated.
- Use display dates compatible with the current homepage, full-edition, and email parsers, such as `Tuesday, Oct 13 at 11:30 AM`; retain the verified year/offset in structured timestamps. Read [Date ordering and preview checks](date-ordering-and-preview-checks.md) before formatting corrections.
- Follow the digest workflow's raw-array preservation and target-environment authentication procedures. Insert new events chronologically without changing retained objects, stable identities, relative order, spotlights, or send metadata.
- Do not assume `scrape-event` retains structured timestamps, address fields, or supplied coordinates; inspect the current handler before choosing it. If a full-array PATCH is necessary, audit schema compatibility, re-read immediately before writing, and compare retained objects afterward.
- AI additions do not authorize emails, publication, or changes to other cities. Follow the current request's target-environment scope and verify each environment actually updated.

## Completion gate

Before delivering a newly created or refreshed city edition:

- Confirm verified AI events were included, or explicitly report that none could be verified.
- Confirm each added AI event is labeled **Tech** and has the correct local date and official link.
- Check the intended edition in both public latest/list responses and the visible homepage/full edition; an API success alone is insufficient.
- Verify an event/venue journey using links actually present in the page. Inspect the email preview when preparing a newsletter, without sending it unless requested.
- Verify chronological display independently on the homepage, full edition, and newsletter preview, including same-day start times. Re-read raw records to confirm source-backed timestamps survived any caption edits; inclusion alone does not prove ordering or preservation.
- Confirm original listings and spotlights were preserved, additions are not duplicated, and edition send metadata is unchanged for page-only edits.
