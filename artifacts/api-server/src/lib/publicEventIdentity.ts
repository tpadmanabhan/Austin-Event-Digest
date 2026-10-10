import { createHash } from "node:crypto";
import type { EventItem } from "@workspace/db";

function sourceKey(e: EventItem): string {
  // Do not remove URL queries: they can distinguish different event occurrences.
  return e.link?.trim() || e.title.trim().toLowerCase();
}

export function withPublicEventIds(events: EventItem[], tenantId: number, previous: EventItem[] = []): EventItem[] {
  return events.map(event => {
    const exact = previous.find(old => sourceKey(old) === sourceKey(event) && old.date === event.date);
    const candidates = previous.filter(old => sourceKey(old) === sourceKey(event) && old.title === event.title);
    const prior = previous.find(old => event.eventId && old.eventId === event.eventId) || exact || (candidates.length === 1 ? candidates[0] : undefined);
    const previousId = /^ev-[a-f0-9]{24}$/.test(prior?.eventId || "") ? prior?.eventId : undefined;
    const cleaned = { ...event };
    if (prior) {
      if (prior.date !== event.date && event.startDate === prior.startDate) {
        delete cleaned.startDate; delete cleaned.endDate; delete cleaned.timezone;
      } else if (prior.date === event.date && prior.link === event.link) {
        if (cleaned.startDate === undefined && prior.startDate) cleaned.startDate = prior.startDate;
        if (cleaned.endDate === undefined && prior.endDate) cleaned.endDate = prior.endDate;
        if (cleaned.timezone === undefined && prior.timezone) cleaned.timezone = prior.timezone;
      }
      if (prior.venue !== event.venue && event.venueAddress === prior.venueAddress) delete cleaned.venueAddress;
      else if (prior.venue === event.venue && cleaned.venueAddress === undefined && prior.venueAddress) cleaned.venueAddress = prior.venueAddress;
    }
    const identity = `${tenantId}\n${sourceKey(event)}\n${event.date}`;
    const sameVenue = !prior || prior.venue === event.venue;
    const suppliedVenue = sameVenue ? event.venueId || prior?.venueId : undefined;
    const venueId = event.venue?.trim() ? /^vn-[a-f0-9]{24}$/.test(suppliedVenue || "") ? suppliedVenue :
      `vn-${createHash("sha256").update(`${tenantId}\n${event.venue.trim().toLowerCase()}`).digest("hex").slice(0, 24)}` : undefined;
    return { ...cleaned, venueId, eventId: /^ev-[a-f0-9]{24}$/.test(event.eventId || "") ? event.eventId : previousId || `ev-${createHash("sha256").update(identity).digest("hex").slice(0, 24)}` };
  });
}
