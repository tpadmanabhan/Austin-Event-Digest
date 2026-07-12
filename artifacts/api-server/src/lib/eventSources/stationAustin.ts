import type { SourceAdapter, SourceQuery } from "./types";
import type { EventItem } from "@workspace/db";
import { isWithinDateRange, guessCategory } from "./utils";
import { logger } from "../logger";

// Known recurring tech meetup event slugs at Station Austin.
// These pages work individually — scrape each and check if the date is in range.
const RECURRING_EVENT_SLUGS = [
  "leveraging-ai-for-founders-professionals-meetup",
  "hack-ai-meetup",
  "ai-tinkerers-austin-meetup",
  "react-atx-meetup",
  "austin-elixir-meetup",
  "bitcoin-builders-club-meetup",
  "austin-startup-founders-meetup",
  "python-austin-meetup",
  "ux-austin-meetup",
  "cloud-austin-meetup",
];

interface ParsedEvent {
  title: string;
  startIso: string | null;
  venue: string;
  description: string;
  url: string;
}

async function fetchEventPage(slug: string): Promise<ParsedEvent | null> {
  const url = `https://stationaustin.org/event/${slug}/`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return null;
  }

  if (res.status === 404) return null;
  if (!res.ok) return null;

  const html = await res.text();

  // Try JSON-LD first
  const jldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  if (jldMatch) {
    try {
      const jld = JSON.parse(jldMatch[1]);
      if (jld["@type"] === "Event" && jld.name && jld.startDate) {
        const isoDate = jld.startDate.includes("T") ? jld.startDate : `${jld.startDate}T00:00:00`;
        return {
          title: jld.name.trim(),
          startIso: isoDate,
          venue: jld.location?.name || "Station Austin",
          description: (jld.description || jld.name).substring(0, 400),
          url,
        };
      }
    } catch { /* fall through */ }
  }

  // Fallback: parse title + date from page text
  const titleMatch = html.match(/<h1[^>]*class="[^"]*tribe-events-single-event-title[^"]*"[^>]*>([^<]+)/i)
    || html.match(/<title[^>]*>([^|<]+)/i);
  const title = titleMatch ? titleMatch[1].trim() : null;
  if (!title || title.includes("Page Not Found")) return null;

  // Extract date from datetime attribute or visible date strings
  const dtMatch = html.match(/datetime="([^"]+)"/i);
  const dateTextMatch = html.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+2026/i);

  let startIso: string | null = null;
  if (dtMatch) {
    startIso = dtMatch[1];
  } else if (dateTextMatch) {
    const d = new Date(dateTextMatch[0]);
    startIso = isNaN(d.getTime()) ? null : d.toISOString();
  }

  if (!startIso) return null;

  const timeMatch = html.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
  if (timeMatch && !startIso.includes("T")) {
    // Try to attach time
    const [h, rest] = timeMatch[1].split(":");
    const mins = rest.replace(/\D.*/g, "");
    const isPm = /PM/i.test(timeMatch[1]);
    let hour = parseInt(h, 10);
    if (isPm && hour !== 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
    const base = new Date(startIso);
    base.setHours(hour, parseInt(mins, 10), 0, 0);
    startIso = base.toISOString();
  }

  const descMatch = html.match(/<div[^>]*class="[^"]*tribe-events-single-section[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  const description = descMatch
    ? descMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().substring(0, 400)
    : title;

  return { title, startIso, venue: "Station Austin", description, url };
}

async function fetchStationAustinEvents(query: SourceQuery): Promise<EventItem[]> {
  // Only run for Austin — Station Austin is Austin-specific
  if (!query.city.toLowerCase().includes("austin")) return [];

  const results = await Promise.allSettled(
    RECURRING_EVENT_SLUGS.map(slug => fetchEventPage(slug))
  );

  const events: EventItem[] = [];
  for (const result of results) {
    if (result.status !== "fulfilled" || !result.value) continue;
    const parsed = result.value;
    if (!parsed.startIso) continue;
    if (!isWithinDateRange(parsed.startIso, query.weekOf, query.weekEnd)) continue;

    const timeStr = (() => {
      try {
        const d = new Date(parsed.startIso);
        return d.toLocaleString("en-US", {
          weekday: "long", month: "short", day: "numeric",
          hour: "numeric", minute: "2-digit", hour12: true,
          timeZone: "America/Chicago",
        });
      } catch { return ""; }
    })();

    events.push({
      title: parsed.title,
      date: timeStr,
      venue: parsed.venue,
      description: parsed.description,
      category: guessCategory(`${parsed.title} ${parsed.description}`),
      link: parsed.url,
      imageUrl: null,
      source: "Station Austin",
    });
  }

  logger.info({ source: "StationAustin", category: query.category, found: events.length }, "StationAustin adapter result");
  return events;
}

export const stationAustinAdapter: SourceAdapter = {
  name: "StationAustin",
  fetchEvents: fetchStationAustinEvents,
};
