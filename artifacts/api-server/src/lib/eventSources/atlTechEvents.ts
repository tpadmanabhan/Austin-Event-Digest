import type { SourceAdapter, SourceQuery } from "./types";
import type { EventItem } from "@workspace/db";
import { formatISODate } from "./utils";
import { isWithinCityBounds } from "../cityBounds";
import { logger } from "../logger";

const ATLANTA_TIMEZONE = "America/New_York";
const ATLANTA_CITY_NAMES = new Set(["Atlanta", "Atlanta, GA"]);

interface AtlTechEvent {
  title?: unknown;
  description?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  eventURL?: unknown;
  eventType?: unknown;
  organization?: unknown;
  location?: unknown;
  lat?: unknown;
  lon?: unknown;
  tags?: unknown;
  isPrivate?: unknown;
  isPublic?: unknown;
  visibility?: unknown;
}

function toAtlantaInstant(value: string): Date | null {
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/);
  if (!parts) return null;
  const [, y, mo, day, hour = "0", minute = "0", second = "0", millisecond = "0"] = parts;
  const wallTime = Date.UTC(
    Number(y), Number(mo) - 1, Number(day), Number(hour), Number(minute), Number(second),
    Number(millisecond.padEnd(3, "0")),
  );
  let instant = wallTime;
  for (let attempt = 0; attempt < 2; attempt++) {
    const zonedParts = new Intl.DateTimeFormat("en-US", {
      timeZone: ATLANTA_TIMEZONE,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(instant));
    const values = Object.fromEntries(zonedParts.map(part => [part.type, part.value]));
    const representedAsUtc = Date.UTC(
      Number(values.year), Number(values.month) - 1, Number(values.day),
      Number(values.hour), Number(values.minute), Number(values.second),
    );
    const offset = representedAsUtc - Math.floor(instant / 1000) * 1000;
    instant = wallTime - offset;
  }
  const parsed = new Date(instant);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthKeys(query: SourceQuery): Array<{ year: number; month: number }> {
  const start = query.weekOf;
  const end = query.weekEnd ?? new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const last = new Date(end.getTime() - 1);
  const finalMonth = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), 1));
  const result: Array<{ year: number; month: number }> = [];
  while (cursor <= finalMonth) {
    result.push({ year: cursor.getUTCFullYear(), month: cursor.getUTCMonth() + 1 });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return result;
}

function publicEventUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return null;
    if (url.hostname === "localhost" || url.hostname.endsWith(".localhost") || url.hostname.endsWith(".local")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isPrivateOrVirtual(event: AtlTechEvent): boolean {
  const metadata = [event.eventType, event.visibility].filter(v => typeof v === "string").join(" ").toLowerCase();
  if (event.isPrivate === true || event.isPublic === false) return true;
  if (/\b(private|invite.only|members.only|virtual|online)\b/.test(metadata)) return true;
  const location = typeof event.location === "string"
    ? event.location
    : typeof event.location === "object" && event.location !== null
      ? String((event.location as Record<string, unknown>).name ?? (event.location as Record<string, unknown>).address ?? "")
      : "";
  return /\b(virtual|online only|zoom|webinar)\b/i.test(location);
}

function venueName(location: unknown): string | null {
  const value = typeof location === "string"
    ? location
    : typeof location === "object" && location !== null
      ? (location as Record<string, unknown>).name ?? (location as Record<string, unknown>).address
      : null;
  if (typeof value !== "string" || !value.trim()) return null;
  if (/\b(virtual|online only|zoom|webinar)\b/i.test(value)) return null;
  return value.trim().slice(0, 120);
}

function coordinate(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

function cleanDescription(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400)
    : "";
}

export async function fetchAtlTechEvents(query: SourceQuery): Promise<EventItem[]> {
  if (!ATLANTA_CITY_NAMES.has(query.city.trim()) || query.category !== "Tech") return [];

  const end = query.weekEnd ?? new Date(query.weekOf.getTime() + 7 * 24 * 60 * 60 * 1000);
  const months = monthKeys(query);
  if (months.length === 0) return [];

  const monthlyResults = await Promise.all(months.map(async ({ year, month }) => {
    const url = `https://www.atltech.events/api/Events/month/${year}/${month}`;
    try {
      const response = await fetch(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        logger.warn({ status: response.status, year, month }, "ATLTech.events returned a non-OK response");
        return [];
      }
      const data: unknown = await response.json();
      if (!Array.isArray(data)) {
        logger.warn({ year, month }, "ATLTech.events returned an invalid event list");
        return [];
      }
      return data as AtlTechEvent[];
    } catch (err) {
      logger.warn({ err, year, month }, "ATLTech.events fetch failed");
      return [];
    }
  }));

  const results: EventItem[] = [];
  const seen = new Set<string>();
  for (const event of monthlyResults.flat()) {
    if (!event || typeof event !== "object") continue;
    if (typeof event.title !== "string" || !event.title.trim()) continue;
    if (typeof event.startDate !== "string" || !event.startDate) continue;
    if (isPrivateOrVirtual(event)) continue;

    const start = toAtlantaInstant(event.startDate);
    if (!start || start < query.weekOf || start >= end) continue;
    const venue = venueName(event.location);
    const lat = coordinate(event.lat);
    const lon = coordinate(event.lon);
    if (!venue || lat === null || lon === null || !isWithinCityBounds("atlanta", lat, lon)) continue;
    const link = publicEventUrl(event.eventURL);
    if (!link) continue;

    const title = event.title.trim();
    const dateKey = start.toISOString();
    const key = `${title.toLowerCase().replace(/\s+/g, " ").trim()}|${dateKey}|${venue.toLowerCase().replace(/\s+/g, " ").trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      title,
      date: formatISODate(start.toISOString(), ATLANTA_TIMEZONE),
      venue,
      description: cleanDescription(event.description),
      category: "Tech",
      link,
      imageUrl: null,
      source: "ATLTech.events",
      lat,
      lng: lon,
    });
  }

  logger.info({ category: query.category, found: results.length, months: months.length }, "ATLTech.events adapter result");
  return results;
}

export const atlTechEventsAdapter: SourceAdapter = {
  name: "ATLTech.events",
  fetchEvents: fetchAtlTechEvents,
};
