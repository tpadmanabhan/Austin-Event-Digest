const LOCALIST_BASE_URL = "https://santamonica.enterprise.localist.com";
const LOCALIST_CALENDAR_URL = `${LOCALIST_BASE_URL}/events`;
const CACHE_TTL_MS = 15 * 60 * 1000;
const DISPLAY_LIMIT = 4;

type LocalistInstance = {
  start?: string;
  end?: string | null;
};

type LocalistEventRecord = {
  id?: number | string;
  event_id?: number | string;
  title?: string;
  localist_url?: string;
  location_name?: string;
  address?: string;
  description_text?: string;
  free?: boolean | null;
  filters?: {
    event_types?: Array<{ name?: string }>;
  };
  event_instances?: Array<{
    event_instance?: LocalistInstance;
    start?: string;
    end?: string | null;
  }>;
};

type LocalistResponse = {
  events?: Array<{ event?: LocalistEventRecord }>;
};

export type CentinelaLocalEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  venue: string;
  category: string | null;
  description: string;
  url: string;
  free: boolean | null;
};

export type CentinelaLocalEventsResult = {
  events: CentinelaLocalEvent[];
  sourceUrl: string;
  refreshedAt: string;
};

let cachedResult: CentinelaLocalEventsResult | null = null;
let cacheExpiresAt = 0;

function localDateString(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function addCalendarDays(dateString: string, days: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function cleanText(value: string | undefined, maxLength: number): string {
  const text = (value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function nextStart(
  record: LocalistEventRecord,
  now: number,
): LocalistInstance | undefined {
  return (record.event_instances ?? [])
    .map((item) => item.event_instance ?? item)
    .filter((instance) => typeof instance.start === "string" && Date.parse(instance.start) >= now)
    .sort((left, right) => Date.parse(left.start!) - Date.parse(right.start!))[0];
}

export async function getCentinelaLocalEvents(): Promise<CentinelaLocalEventsResult> {
  if (cachedResult && Date.now() < cacheExpiresAt) return cachedResult;

  const today = localDateString(new Date());
  const endDate = addCalendarDays(today, 30);
  const url = new URL("/api/2/events", LOCALIST_BASE_URL);
  url.searchParams.set("pp", "60");
  url.searchParams.set("start", today);
  url.searchParams.set("end", endDate);

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    throw new Error(`Localist calendar returned HTTP ${response.status}`);
  }

  const raw = (await response.json()) as LocalistResponse;
  const now = Date.now();
  const events: CentinelaLocalEvent[] = [];
  const seen = new Set<string>();

  for (const wrapper of raw.events ?? []) {
    const record = wrapper.event;
    if (!record?.title || !record.localist_url) continue;
    const instance = nextStart(record, now);
    if (!instance?.start) continue;

    const eventUrl = new URL(record.localist_url, LOCALIST_BASE_URL).toString();
    const id = String(record.id ?? record.event_id ?? eventUrl);
    const dedupeKey = `${id}:${eventUrl}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const categoryNames = (record.filters?.event_types ?? [])
      .map((item) => item.name?.trim())
      .filter((name): name is string => Boolean(name));

    events.push({
      id,
      title: cleanText(record.title, 160),
      startsAt: instance.start,
      endsAt: instance.end ?? null,
      venue: cleanText(record.location_name || record.address, 180) || "See event details",
      category: categoryNames.length ? categoryNames.join(" · ") : null,
      description: cleanText(record.description_text, 280),
      url: eventUrl,
      free: typeof record.free === "boolean" ? record.free : null,
    });
  }

  events.sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  const result: CentinelaLocalEventsResult = {
    events: events.slice(0, DISPLAY_LIMIT),
    sourceUrl: LOCALIST_CALENDAR_URL,
    refreshedAt: new Date().toISOString(),
  };

  cachedResult = result;
  cacheExpiresAt = now + CACHE_TTL_MS;
  return result;
}
