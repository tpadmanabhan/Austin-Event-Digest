import type { SourceAdapter, SourceQuery } from "./types";
import type { EventItem } from "@workspace/db";
import { guessCategory, isWithinDateRange, formatISODate } from "./utils";
import { logger } from "../logger";

const SEARCH_PATHS: Record<string, string[]> = {
  Tech: [
    "/d/tx--austin/tech--events--this-week/",
    "/d/tx--austin/ai--technology--events--this-week/",
    "/d/tx--austin/startup--events--this-week/",
  ],
  Food: ["/d/tx--austin/food--events--this-week/"],
  Music: ["/d/tx--austin/music--events--this-week/"],
  Wellness: ["/d/tx--austin/fitness--events--this-week/"],
  Civics: ["/d/tx--austin/community--events--this-week/"],
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

async function scrapeEventbritePage(path: string, query: SourceQuery): Promise<EventItem[]> {
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
    const imageUrl = typeof ev.image === "string" ? ev.image : ev.image?.url || null;

    events.push({
      title: ev.name.trim(),
      date: formatISODate(isoDate, "America/Chicago"),
      venue: locationName.substring(0, 120),
      description: (ev.description || `${ev.name} — ${locationName}`).substring(0, 400),
      category: guessCategory(`${ev.name} ${ev.description || ""}`),
      link: ev.url || null,
      imageUrl: imageUrl || null,
      source: "Eventbrite",
    });
  }

  return events;
}

async function fetchEventbriteWebEvents(query: SourceQuery): Promise<EventItem[]> {
  const paths = SEARCH_PATHS[query.category] || [];
  if (paths.length === 0) return [];

  const results = await Promise.allSettled(paths.map(p => scrapeEventbritePage(p, query)));
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

  logger.info({ source: "EventbriteWeb", category: query.category, found: allEvents.length }, "EventbriteWeb adapter result");
  return allEvents;
}

export const eventbriteWebAdapter: SourceAdapter = {
  name: "EventbriteWeb",
  fetchEvents: fetchEventbriteWebEvents,
};
