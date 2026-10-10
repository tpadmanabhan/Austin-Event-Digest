import type { EventItem } from "@workspace/db";

type Metadata = { startDate?: string; timezone?: string; venueAddress?: string };
type TicketmasterEvent = {
  name?: string;
  dates?: { start?: { dateTime?: string; localDate?: string; timeTBA?: boolean; dateTBA?: boolean; dateTBD?: boolean }; status?: { code?: string } };
  _embedded?: { venues?: { name?: string; timezone?: string; address?: { line1?: string } }[] };
};
const normalized = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

export function metadataFromTicketmaster(event: EventItem, source: TicketmasterEvent): Metadata {
  const venue = source._embedded?.venues?.[0];
  if (!source.name || normalized(source.name) !== normalized(event.title) || !venue?.name ||
      !normalized(event.venue).includes(normalized(venue.name)) ||
      ["cancelled", "canceled", "postponed"].includes(source.dates?.status?.code || "") ||
      source.dates?.start?.dateTBA || source.dates?.start?.dateTBD) return {};
  const startDate = source.dates?.start?.timeTBA ? source.dates.start.localDate :
    source.dates?.start?.dateTime || source.dates?.start?.localDate;
  const localDate = source.dates?.start?.localDate;
  if (!startDate || !localDate || !Number.isFinite(Date.parse(startDate))) return {};
  const displayed = event.date.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})/i);
  // Match only the stated month/day. The year and time come from the source,
  // never from an inferred edition year or a fabricated default start time.
  if (!displayed || Number(localDate.slice(5, 7)) !== months.indexOf(displayed[1].toLowerCase()) + 1 ||
      Number(localDate.slice(8, 10)) !== Number(displayed[2])) return {};
  return { startDate, ...(venue.timezone ? { timezone: venue.timezone } : {}),
    ...(venue.address?.line1 ? { venueAddress: venue.address.line1 } : {}) };
}

const cache = new Map<string, { until: number; metadata: Metadata }>();
export async function verifiedEventMetadata(event: EventItem, tenantId: number): Promise<Metadata> {
  const key = `${tenantId}|${event.eventId}|${event.link}|${event.title}|${event.date}|${event.venue}`;
  const cached = cache.get(key);
  if (cached && cached.until > Date.now()) return cached.metadata;
  let metadata: Metadata = {};
  try {
    const link = new URL(event.link || "");
    const sourceId = link.pathname.match(/\/event\/([a-zA-Z0-9_-]{1,80})\/?$/)?.[1];
    if (["ticketmaster.com", "www.ticketmaster.com"].includes(link.hostname) && sourceId && process.env.TICKETMASTER_API_KEY) {
      const source = new URL(`https://app.ticketmaster.com/discovery/v2/events/${encodeURIComponent(sourceId)}.json`);
      source.searchParams.set("apikey", process.env.TICKETMASTER_API_KEY);
      const response = await fetch(source, { signal: AbortSignal.timeout(4000) });
      if (response.ok) metadata = metadataFromTicketmaster(event, await response.json() as TicketmasterEvent);
    }
  } catch {
    // An unverified source is not an Event-schema candidate. Do not log URLs
    // containing provider credentials, and do not invent a replacement date.
  }
  if (cache.size >= 200) cache.delete(cache.keys().next().value!);
  cache.set(key, { until: Date.now() + (metadata.startDate ? 30 : 5) * 60_000, metadata });
  return metadata;
}
