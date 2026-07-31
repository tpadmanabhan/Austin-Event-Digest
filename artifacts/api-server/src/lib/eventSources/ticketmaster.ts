import type { SourceAdapter, SourceQuery } from "./types";
import type { EventItem } from "@workspace/db";
import { getCityGeo, guessCategory, isWithinDateRange, formatISODate } from "./utils";
import { logger } from "../logger";

/** Maps canonical category names to Ticketmaster classification names */
const TM_CLASSIFICATION: Record<string, string> = {
  Music:            "Music",
  Arts:             "Arts & Theatre",
  "Arts & Culture": "Arts & Theatre",
  Sports:           "Sports",
  Tech:             "Miscellaneous",
  Food:             "Miscellaneous",
  Wellness:         "Sports",
  Civics:           "Miscellaneous",
};

interface TmEvent {
  name: string;
  url?: string;
  dates?: { start?: { dateTime?: string; localDate?: string; localTime?: string } };
  description?: string;
  info?: string;
  pleaseNote?: string;
  images?: Array<{ ratio?: string; url: string; width?: number; height?: number }>;
  classifications?: Array<{ segment?: { name?: string }; genre?: { name?: string } }>;
  _embedded?: {
    venues?: Array<{ name?: string; city?: { name?: string }; address?: { line1?: string }; state?: { stateCode?: string } }>;
  };
}

interface TmResponse {
  _embedded?: { events?: TmEvent[] };
  page?: { totalElements?: number };
}

async function fetchTicketmasterEvents(query: SourceQuery): Promise<EventItem[]> {
  const apiKey = process.env["TICKETMASTER_API_KEY"];
  if (!apiKey) {
    return [];
  }

  const geo = getCityGeo(query.city);
  const timezone = geo?.timezone || "America/Chicago";

  // Parse city and optional state from the city string (e.g. "Austin, TX")
  const parts = query.city.split(",").map(s => s.trim());
  const cityName = parts[0];
  const stateCode = parts[1] || "";

  const weekEnd = query.weekEnd || new Date(query.weekOf.getTime() + 7 * 24 * 60 * 60 * 1000);
  const classification = TM_CLASSIFICATION[query.category];

  const params = new URLSearchParams({
    apikey: apiKey,
    city: cityName,
    size: "50",
    sort: "date,asc",
    startDateTime: query.weekOf.toISOString().replace(/\.\d{3}Z$/, "Z"),
    endDateTime: weekEnd.toISOString().replace(/\.\d{3}Z$/, "Z"),
  });

  if (stateCode) params.set("stateCode", stateCode);
  if (classification) params.set("classificationName", classification);

  // For small cities (Brushy Creek, Bulverde), use lat/lng radius instead of city name
  if (geo && (cityName === "Brushy Creek" || cityName === "Bulverde" || cityName === "Austin Cares")) {
    params.delete("city");
    params.delete("stateCode");
    params.set("latlong", `${geo.lat},${geo.lon}`);
    params.set("radius", "30");
    params.set("unit", "miles");
  }

  const url = `https://app.ticketmaster.com/discovery/v2/events.json?${params}`;

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  } catch (err) {
    logger.warn({ err }, "Ticketmaster: fetch failed");
    return [];
  }

  if (res.status === 401 || res.status === 403) {
    logger.warn({ status: res.status }, "Ticketmaster: invalid API key");
    return [];
  }
  if (!res.ok) {
    logger.debug({ status: res.status, url }, "Ticketmaster: non-OK response");
    return [];
  }

  const data = (await res.json()) as TmResponse;
  const tmEvents = data._embedded?.events || [];

  const dragQueenRe = /drag queen/i;
  const events: EventItem[] = [];
  for (const ev of tmEvents) {
    const startIso = ev.dates?.start?.dateTime || (ev.dates?.start?.localDate ? `${ev.dates.start.localDate}T${ev.dates.start.localTime || "19:00:00"}` : null);
    if (!startIso) continue;
    if (!isWithinDateRange(startIso, query.weekOf, query.weekEnd)) continue;
    if (dragQueenRe.test(ev.name)) continue;

    const venue = ev._embedded?.venues?.[0];
    const venueName = venue
      ? [venue.name, venue.city?.name || cityName].filter(Boolean).join(", ")
      : cityName;

    // Prefer 16:9 wide images
    const image = ev.images?.find(i => i.ratio === "16_9" && (i.width || 0) > 500)?.url
      || ev.images?.[0]?.url
      || null;

    const description = (ev.description || ev.info || ev.pleaseNote || `${ev.name} at ${venueName}`).substring(0, 400);

    events.push({
      title: ev.name.trim(),
      date: formatISODate(startIso, timezone),
      venue: venueName.substring(0, 120),
      description,
      category: guessCategory(`${ev.name} ${ev.classifications?.[0]?.segment?.name || ""}`),
      link: ev.url || null,
      imageUrl: image,
      source: "Ticketmaster",
    });
  }

  logger.info({ source: "Ticketmaster", city: query.city, category: query.category, found: events.length }, "Ticketmaster adapter result");
  return events;
}

export const ticketmasterAdapter: SourceAdapter = {
  name: "Ticketmaster",
  fetchEvents: fetchTicketmasterEvents,
};
