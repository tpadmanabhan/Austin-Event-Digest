import type { SourceAdapter, SourceQuery } from "./types";
import type { EventItem } from "@workspace/db";
import { formatISODate, isWithinDateRange, guessCategory } from "./utils";
import { logger } from "../logger";

const BANDSINTOWN_APP_ID = process.env.BANDSINTOWN_APP_ID || "1";

interface BITOffer {
  type: string;
  url: string;
}

interface BITVenue {
  name: string;
  city: string;
  country: string;
  region?: string;
  location?: string;
}

interface BITEvent {
  id: string;
  title?: string;
  artist?: { name: string; url?: string };
  datetime: string;
  url: string;
  offers?: BITOffer[];
  venue?: BITVenue;
  description?: string;
  lineup?: string[];
}

async function fetchBandsintownEvents(query: SourceQuery): Promise<EventItem[]> {
  const cityEncoded = encodeURIComponent(query.city);
  const weekEnd = query.weekEnd || new Date(query.weekOf.getTime() + 7 * 24 * 60 * 60 * 1000);

  const dateFrom = query.weekOf.toISOString().substring(0, 10);
  const dateTo = weekEnd.toISOString().substring(0, 10);

  const url = `https://rest.bandsintown.com/v3.1/events/search?app_id=${encodeURIComponent(BANDSINTOWN_APP_ID)}&location=${cityEncoded}&date=${dateFrom}%2C${dateTo}&per_page=50&sort_by_date=true`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "eventcarpooling-newsletter/1.0",
      },
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    logger.debug({ err }, "Bandsintown: network error — skipping");
    return [];
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      logger.debug({ status: res.status }, "Bandsintown: not available without valid app_id");
    } else {
      logger.warn({ status: res.status }, "Bandsintown: unexpected response");
    }
    return [];
  }

  let raw: unknown;
  try {
    raw = await res.json();
  } catch {
    return [];
  }

  if (!Array.isArray(raw)) {
    logger.debug("Bandsintown: unexpected response shape");
    return [];
  }

  const bitEvents = raw as BITEvent[];
  const events: EventItem[] = [];

  for (const ev of bitEvents) {
    if (!ev.datetime) continue;
    if (!isWithinDateRange(ev.datetime, query.weekOf, query.weekEnd)) continue;

    const artistName = ev.artist?.name || ev.lineup?.[0] || "Unknown Artist";
    const title = ev.title || `${artistName} Live`;
    const venue = ev.venue
      ? `${ev.venue.name}, ${ev.venue.city}`
      : query.city;

    const description = ev.description
      || `${title} at ${venue}`;

    const ticketUrl = ev.offers?.find(o => o.type === "Tickets")?.url || ev.url || null;

    events.push({
      title: title.trim(),
      date: formatISODate(ev.datetime, "America/Chicago"),
      venue: venue.substring(0, 120),
      description: description.substring(0, 400),
      category: "Music",
      link: ticketUrl,
      imageUrl: null,
      source: "Bandsintown",
    });
  }

  logger.info({ source: "Bandsintown", found: events.length }, "Bandsintown adapter result");
  return events;
}

export const bandsintownAdapter: SourceAdapter = {
  name: "Bandsintown",
  fetchEvents: fetchBandsintownEvents,
};
