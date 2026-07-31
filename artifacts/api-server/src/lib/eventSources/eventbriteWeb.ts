import type { SourceAdapter, SourceQuery } from "./types";
import type { EventItem } from "@workspace/db";
import { getCityGeo, guessCategory, isWithinDateRange, formatISODate, decodeHtmlEntities } from "./utils";
import { logger } from "../logger";

/**
 * Maps tenant city strings to Eventbrite's {state}--{city} URL slug format.
 * Nearest large city is used for small communities that Eventbrite doesn't list directly.
 */
const CITY_SLUG: Record<string, string> = {
  "Austin": "tx--austin",
  "Austin, TX": "tx--austin",
  "Austin, Texas": "tx--austin",
  "Austin Cares": "tx--austin",
  "Brushy Creek": "tx--austin",
  "Brushy Creek, TX": "tx--austin",
  "Bulverde": "tx--san-antonio",
  "Bulverde, TX": "tx--san-antonio",
  "Sacramento": "ca--sacramento",
  "Sacramento, CA": "ca--sacramento",
  "Portland": "or--portland",
  "Portland, OR": "or--portland",
  "St. Louis": "mo--st-louis",
  "St. Louis, MO": "mo--st-louis",
  "Saint Louis": "mo--st-louis",
  "Saint Louis, MO": "mo--st-louis",
  "New York": "ny--new-york",
  "New York, NY": "ny--new-york",
  "Chicago": "il--chicago",
  "Chicago, IL": "il--chicago",
  "Seattle": "wa--seattle",
  "Seattle, WA": "wa--seattle",
  "Denver": "co--denver",
  "Denver, CO": "co--denver",
  "Miami": "fl--miami",
  "Miami, FL": "fl--miami",
  "Boston": "ma--boston",
  "Boston, MA": "ma--boston",
  "Nashville": "tn--nashville",
  "Nashville, TN": "tn--nashville",
  "Atlanta": "ga--atlanta",
  "Atlanta, GA": "ga--atlanta",
  "Dallas": "tx--dallas",
  "Dallas, TX": "tx--dallas",
  "Houston": "tx--houston",
  "Houston, TX": "tx--houston",
  "Phoenix": "az--phoenix",
  "Phoenix, AZ": "az--phoenix",
  "Minneapolis": "mn--minneapolis",
  "Minneapolis, MN": "mn--minneapolis",
  "San Diego": "ca--san-diego",
  "San Diego, CA": "ca--san-diego",
};

function getCitySlug(city: string): string | null {
  const normalized = city.trim();
  return CITY_SLUG[normalized] || CITY_SLUG[normalized.split(",")[0].trim()] || null;
}

/** Category → Eventbrite path keywords, in priority order */
const CATEGORY_PATHS: Record<string, string[]> = {
  Tech:            ["tech--events", "ai--technology--events", "startup--events"],
  Food:            ["food--events"],
  Music:           ["music--events"],
  Wellness:        ["fitness--events", "wellness--events"],
  Civics:          ["community--events"],
  "Arts & Culture":["arts--events"],
  Arts:            ["arts--events"],
  Sports:          ["sports--events"],
};

interface LdEvent {
  "@type"?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  url?: string;
  location?: { name?: string; address?: { streetAddress?: string; addressLocality?: string } };
  image?: string | { url?: string };
  item?: LdEvent;
}

async function scrapeEventbritePage(path: string, query: SourceQuery, timezone: string): Promise<EventItem[]> {
  const url = `https://www.eventbrite.com${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(12000),
    });
  } catch (err) {
    logger.warn({ err, url }, "EventbriteWeb: fetch failed");
    return [];
  }

  if (!res.ok) {
    logger.debug({ status: res.status, url }, "EventbriteWeb: non-OK response");
    return [];
  }

  const html = await res.text();

  const jsonldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)]
    .map(m => { try { return JSON.parse(m[1]) as LdEvent | { itemListElement?: { item?: LdEvent }[] }; } catch { return null; } })
    .filter(Boolean);

  const rawEvents: LdEvent[] = jsonldBlocks.flatMap(j => {
    const list = j as { itemListElement?: { item?: LdEvent }[] };
    if (list.itemListElement) return list.itemListElement.map(el => el.item || el as LdEvent);
    const ev = j as LdEvent;
    if (ev["@type"] === "Event") return [ev];
    return [];
  }).filter((e): e is LdEvent => !!(e && e["@type"] === "Event" && e.name && e.startDate));

  const events: EventItem[] = [];
  for (const ev of rawEvents) {
    if (!ev.name || !ev.startDate) continue;
    const isoDate = ev.startDate.includes("T") ? ev.startDate : `${ev.startDate}T19:00:00Z`;
    if (!isWithinDateRange(isoDate, query.weekOf, query.weekEnd)) continue;

    const locationName = ev.location?.name || ev.location?.address?.addressLocality || query.city;
    const imageUrl = decodeHtmlEntities(typeof ev.image === "string" ? ev.image : ev.image?.url || null);

    events.push({
      title: ev.name.trim(),
      date: formatISODate(isoDate, timezone),
      venue: locationName.substring(0, 120),
      description: (ev.description || `${ev.name} — ${locationName}`).substring(0, 400),
      category: guessCategory(`${ev.name} ${ev.description || ""}`),
      link: decodeHtmlEntities(ev.url || null),
      imageUrl: imageUrl || null,
      source: "Eventbrite",
    });
  }

  return events;
}

async function fetchEventbriteWebEvents(query: SourceQuery): Promise<EventItem[]> {
  const slug = getCitySlug(query.city);
  if (!slug) {
    logger.warn({ city: query.city }, "EventbriteWeb: no city slug mapping — skipping");
    return [];
  }

  const pathKeywords = CATEGORY_PATHS[query.category] || [];
  if (pathKeywords.length === 0) return [];

  const geo = getCityGeo(query.city);
  const timezone = geo?.timezone || "America/Chicago";
  const paths = pathKeywords.map(kw => `/d/${slug}/${kw}--this-week/`);

  const results = await Promise.allSettled(paths.map(p => scrapeEventbritePage(p, query, timezone)));
  const allEvents: EventItem[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const ev of result.value) {
        const key = ev.title.toLowerCase().substring(0, 40);
        if (!seen.has(key)) {
          seen.add(key);
          allEvents.push(ev);
        }
      }
    }
  }

  logger.info({ source: "EventbriteWeb", city: query.city, slug, category: query.category, found: allEvents.length }, "EventbriteWeb adapter result");
  return allEvents;
}

export const eventbriteWebAdapter: SourceAdapter = {
  name: "EventbriteWeb",
  fetchEvents: fetchEventbriteWebEvents,
};
