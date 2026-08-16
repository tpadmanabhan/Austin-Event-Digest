import type { SourceAdapter, SourceQuery } from "./types";
import type { EventItem } from "@workspace/db";
import { getCategorySearchQuery, formatISODate, isWithinDateRange, guessCategory, decodeHtmlEntities } from "./utils";
import { logger } from "../logger";

const EVENTBRITE_TOKEN = process.env.EVENTBRITE_TOKEN;

interface EBVenue {
  name?: string;
  address?: {
    city?: string;
    localized_address_display?: string;
  };
}

interface EBEvent {
  id: string;
  name: { text: string };
  description?: { text?: string };
  start: { utc: string; local: string };
  end?: { utc: string; local: string };
  url: string;
  logo?: { url?: string };
  venue?: EBVenue;
}

interface EBResponse {
  events?: EBEvent[];
  pagination?: { page_count: number; page_size: number; page_number: number };
  error?: string;
  error_description?: string;
}

async function fetchEventbriteEvents(query: SourceQuery): Promise<EventItem[]> {
  if (!EVENTBRITE_TOKEN) {
    logger.debug("Eventbrite: EVENTBRITE_TOKEN not set — skipping");
    return [];
  }

  const keyword = getCategorySearchQuery(query.category);

  const weekEnd = query.weekEnd || new Date(query.weekOf.getTime() + 7 * 24 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    q: keyword,
    "location.address": query.city,
    "location.within": "25mi",
    "start_date.range_start": query.weekOf.toISOString().replace(".000Z", "Z"),
    "start_date.range_end": weekEnd.toISOString().replace(".000Z", "Z"),
    sort_by: "date",
    expand: "venue",
    page_size: "50",
  });

  const url = `https://www.eventbriteapi.com/v3/events/search/?${params}`;

  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${EVENTBRITE_TOKEN}`,
      accept: "application/json",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.warn({ status: res.status, body: text.substring(0, 200) }, "Eventbrite: request failed");
    return [];
  }

  const data = (await res.json()) as EBResponse;

  if (data.error) {
    logger.warn({ error: data.error, description: data.error_description }, "Eventbrite: API error");
    return [];
  }

  const ebEvents = data.events || [];
  const events: EventItem[] = [];

  for (const ev of ebEvents) {
    if (!ev.name?.text || !ev.start?.utc) continue;
    if (!isWithinDateRange(ev.start.utc, query.weekOf, query.weekEnd)) continue;

    const venueName = ev.venue?.name;
    const venueAddress = ev.venue?.address?.localized_address_display || ev.venue?.address?.city || query.city;
    const venue = venueName ? `${venueName}, ${venueAddress}` : venueAddress;

    const description = ev.description?.text?.substring(0, 400)
      || `${ev.name.text} — ${venue}`;

    events.push({
      title: ev.name.text.trim(),
      date: formatISODate(ev.start.utc, "America/Chicago"),
      venue: venue.substring(0, 120),
      description,
      category: guessCategory(`${ev.name.text} ${description}`),
      link: decodeHtmlEntities(ev.url || null),
      imageUrl: decodeHtmlEntities(ev.logo?.url || null),
      source: "Eventbrite",
    });
  }

  logger.info({ source: "Eventbrite", category: query.category, found: events.length }, "Eventbrite adapter result");
  return events;
}

export const eventbriteAdapter: SourceAdapter = {
  name: "Eventbrite",
  fetchEvents: fetchEventbriteEvents,
};
