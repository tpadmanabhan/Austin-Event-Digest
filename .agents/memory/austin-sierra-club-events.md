---
name: Austin Sierra Club event sourcing
description: How to verify Austin Sierra Club outings and event dates when curating a digest
---

The official Austin Sierra Club site directs readers to its Austin Sierra Club Outings Meetup calendar for local outing schedules. For a specific Meetup event, verify its date, local start time, venue, and image using the event page's `application/ld+json` Event data rather than assuming the first date in extracted markdown is the event date.

**Why:** Extracted Meetup markdown can omit the event's own start time while including dates for unrelated recommended events below it. Search results also may not index specific Meetup event IDs.

**How to apply:** On Austin digest additions from that group, cross-check the official Austin group's site and parse the linked Meetup page's Event JSON-LD. For venue, use the primary event details rather than related-event cards; confirm event-year and timezone before storing the display date.