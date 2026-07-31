import type { SourceAdapter, SourceQuery } from "./types";
import type { EventItem } from "@workspace/db";
import { resolveCityGeo, getCategoryKeywords, formatISODate, isWithinDateRange, guessCategory } from "./utils";
import { logger } from "../logger";

// Keyed by canonical category names (after canonicalizeCategory is applied upstream)
const LUMA_TAG_MAP: Record<string, string[]> = {
  "Tech": ["tech", "startup", "ai"],
  "Food": ["food", "foodie"],
  "Wellness": ["wellness", "yoga", "fitness"],
  "Arts & Culture": ["art", "culture", "music"],
  "Arts": ["art", "culture"],
  "Sports": ["fitness", "sports"],
  "Music": [],
  "Civics": [],
};

interface LumaEvent {
  api_id: string;
  name: string;
  description_short?: string;
  start_at: string;
  end_at?: string;
  url: string;
  geo_address_info?: {
    city?: string;
    full_address?: string;
    description?: string;
  };
  cover_url?: string;
}

interface LumaEntry {
  event: LumaEvent;
}

interface LumaResponse {
  entries?: LumaEntry[];
  next_cursor?: string;
}

async function fetchLumaEvents(query: SourceQuery): Promise<EventItem[]> {
  const geo = await resolveCityGeo(query.city);
  if (!geo) {
    logger.warn({ city: query.city }, "Luma: unknown city — no geo coordinates");
    return [];
  }

  const tags = LUMA_TAG_MAP[query.category] || [];
  const LUMA_SKIP = new Set(["Music", "Civics"]);
  if (LUMA_SKIP.has(query.category)) {
    return [];
  }

  const params = new URLSearchParams({
    pagination_limit: "50",
    period: "future",
    geo_latitude: String(geo.lat),
    geo_longitude: String(geo.lon),
    geo_radius_km: "25",
  });

  if (tags.length > 0) {
    params.set("tag_slug_filter", tags[0]);
  }

  const url = `https://api.lu.ma/public/v1/calendar/list-events?${params}`;

  const lumaKey = process.env["LUMA_API_KEY"];
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "eventcarpooling-newsletter/1.0",
      ...(lumaKey ? { "x-luma-api-key": lumaKey } : {}),
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403 || res.status === 400) {
      logger.debug({ status: res.status }, "Luma: endpoint not available without calendar API key — skipping");
    } else {
      logger.warn({ status: res.status, url }, "Luma: unexpected response");
    }
    return [];
  }

  const data = (await res.json()) as LumaResponse;
  const entries = data.entries || [];

  const events: EventItem[] = [];
  for (const entry of entries) {
    const ev = entry.event;
    if (!ev?.name || !ev?.start_at) continue;

    if (!isWithinDateRange(ev.start_at, query.weekOf, query.weekEnd)) continue;

    const venue = ev.geo_address_info?.full_address
      || ev.geo_address_info?.description
      || ev.geo_address_info?.city
      || query.city;

    const description = ev.description_short
      || `${ev.name} — ${venue}`;

    events.push({
      title: ev.name.trim(),
      date: formatISODate(ev.start_at, geo.timezone),
      venue: venue.substring(0, 120),
      description: description.substring(0, 400),
      category: guessCategory(`${ev.name} ${description}`),
      link: ev.url ? `https://lu.ma/${ev.url}` : null,
      imageUrl: ev.cover_url || null,
    });
  }

  logger.info({ source: "Luma", category: query.category, found: events.length }, "Luma adapter result");
  return events;
}

export const lumaAdapter: SourceAdapter = {
  name: "Luma",
  fetchEvents: fetchLumaEvents,
};
