import type { SourceAdapter, SourceQuery } from "./types";
import type { EventItem } from "@workspace/db";
import { formatISODate, isWithinDateRange } from "./utils";
import { logger } from "../logger";

const SONGKICK_API_KEY = process.env.SONGKICK_API_KEY;

interface SKLocation {
  city: { displayName: string; country: { displayName: string } };
  lat?: number;
  lng?: number;
}

interface SKVenue {
  displayName: string;
  uri?: string;
}

interface SKPerformance {
  artist: { displayName: string; uri?: string };
  billing: string;
}

interface SKEvent {
  id: number;
  displayName: string;
  type: string;
  uri: string;
  start: { date: string; time?: string; datetime?: string };
  venue?: SKVenue;
  location?: SKLocation;
  performance?: SKPerformance[];
}

interface SKEventsCollection {
  event?: SKEvent[];
}

interface SKResponse {
  resultsPage?: {
    results?: SKEventsCollection;
    totalEntries?: number;
    status: string;
  };
}

const CITY_METRO_IDS: Record<string, number> = {
  "Austin": 27781,
  "Austin, TX": 27781,
  "Austin, Texas": 27781,
  "New York": 7644,
  "New York, NY": 7644,
  "San Francisco": 26330,
  "San Francisco, CA": 26330,
  "Los Angeles": 17835,
  "Los Angeles, CA": 17835,
  "Chicago": 9426,
  "Chicago, IL": 9426,
  "Seattle": 24426,
  "Seattle, WA": 24426,
  "Denver": 29119,
  "Denver, CO": 29119,
  "Miami": 31003,
  "Miami, FL": 31003,
  "Boston": 6480,
  "Boston, MA": 6480,
  // Active tenant cities
  "St. Louis": 10842,
  "St. Louis, MO": 10842,
  "Saint Louis": 10842,
  "Saint Louis, MO": 10842,
  "Sacramento": 23059,
  "Sacramento, CA": 23059,
  "Portland": 31503,
  "Portland, OR": 31503,
  // Brushy Creek / Bulverde → nearest major metro (Austin)
  "Brushy Creek": 27781,
  "Brushy Creek, TX": 27781,
  "Bulverde": 27781,
  "Bulverde, TX": 27781,
};

async function fetchSongkickEvents(query: SourceQuery): Promise<EventItem[]> {
  if (!SONGKICK_API_KEY) {
    logger.debug("Songkick: SONGKICK_API_KEY not set — skipping");
    return [];
  }

  const cityNorm = query.city.trim();
  const metroId = CITY_METRO_IDS[cityNorm] || CITY_METRO_IDS[cityNorm.split(",")[0].trim()];
  if (!metroId) {
    logger.warn({ city: query.city }, "Songkick: no metro area ID for city");
    return [];
  }

  const weekEnd = query.weekEnd || new Date(query.weekOf.getTime() + 7 * 24 * 60 * 60 * 1000);
  const minDate = query.weekOf.toISOString().substring(0, 10);
  const maxDate = weekEnd.toISOString().substring(0, 10);

  const params = new URLSearchParams({
    apikey: SONGKICK_API_KEY,
    min_date: minDate,
    max_date: maxDate,
    per_page: "50",
  });

  const url = `https://api.songkick.com/api/3.0/metro_areas/${metroId}/calendar.json?${params}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { accept: "application/json", "user-agent": "eventcarpooling-newsletter/1.0" },
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    logger.debug({ err }, "Songkick: network error — skipping");
    return [];
  }

  if (!res.ok) {
    logger.warn({ status: res.status }, "Songkick: request failed");
    return [];
  }

  const data = (await res.json()) as SKResponse;
  const skEvents = data.resultsPage?.results?.event || [];
  const events: EventItem[] = [];

  for (const ev of skEvents) {
    if (!ev.displayName || !ev.start?.date) continue;

    const isoStr = ev.start.datetime || `${ev.start.date}T${ev.start.time || "20:00:00"}`;
    if (!isWithinDateRange(isoStr, query.weekOf, query.weekEnd)) continue;

    const venueName = ev.venue?.displayName || ev.location?.city?.displayName || query.city;
    const performers = (ev.performance || [])
      .filter(p => p.billing === "headline")
      .map(p => p.artist.displayName)
      .join(", ");
    const description = performers
      ? `${performers} at ${venueName}`
      : `${ev.displayName} at ${venueName}`;

    events.push({
      title: ev.displayName.trim(),
      date: formatISODate(isoStr, "America/Chicago"),
      venue: venueName.substring(0, 120),
      description: description.substring(0, 400),
      category: "Music",
      link: ev.uri || ev.venue?.uri || null,
      imageUrl: null,
    });
  }

  logger.info({ source: "Songkick", found: events.length }, "Songkick adapter result");
  return events;
}

export const songkickAdapter: SourceAdapter = {
  name: "Songkick",
  fetchEvents: fetchSongkickEvents,
};
