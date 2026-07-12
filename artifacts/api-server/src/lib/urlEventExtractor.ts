import OpenAI from "openai";
import type { EventItem } from "@workspace/db";
import { logger } from "./logger";

const client = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

const EVENTBRITE_TOKEN = process.env.EVENTBRITE_TOKEN;

// Domains whose pages are almost entirely JS-rendered — always use Jina.ai
const JS_HEAVY_DOMAINS = [
  "eventbrite.com",
  "meetup.com",
  "do512.com",
  "lu.ma",
  "luma.co",
  "partiful.com",
];

function isJsHeavyDomain(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return JS_HEAVY_DOMAINS.some(d => host === d || host.endsWith("." + d));
  } catch {
    return false;
  }
}

function getWeekBounds(weekOf: Date): { start: Date; end: Date } {
  const start = new Date(weekOf);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

// A page render is considered "thin" (likely a JS shell that never got hydrated)
// when the cleaned text is too short to plausibly contain real event listings.
const THIN_TEXT_THRESHOLD = 400;

async function fetchRawHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{3,}/g, "  ")
    .trim();
}

// Extract og: meta tag value from raw HTML
function extractOgMeta(html: string, property: string): string {
  const m = html.match(new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`, "i"))
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`, "i"));
  return m ? m[1].trim() : "";
}

// Extract first JSON-LD block of @type Event from raw HTML
function extractJsonLdEvent(html: string): Record<string, unknown> | null {
  const blocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of blocks) {
    const inner = block.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "").trim();
    try {
      const data = JSON.parse(inner) as unknown;
      const candidates = Array.isArray(data) ? data : [data];
      for (const item of candidates) {
        if (item && typeof item === "object" && (item as Record<string, unknown>)["@type"] === "Event") {
          return item as Record<string, unknown>;
        }
      }
    } catch {
    }
  }
  return null;
}

// Parse an ISO date string into a human-readable event date label
function formatIsoEventDate(isoStr: unknown): string {
  if (typeof isoStr !== "string") return "";
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString("en-US", {
      weekday: "long", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit", timeZone: "America/Chicago",
    });
  } catch {
    return String(isoStr);
  }
}

// --- Eventbrite: direct API fetch for a single event by ID ---
async function fetchEventbriteById(eventId: string): Promise<EventItem | null> {
  if (!EVENTBRITE_TOKEN) return null;
  try {
    const res = await fetch(`https://www.eventbriteapi.com/v3/events/${eventId}/?expand=venue`, {
      headers: { authorization: `Bearer ${EVENTBRITE_TOKEN}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const ev = await res.json() as Record<string, unknown>;
    const name = (ev.name as Record<string, string> | undefined)?.text;
    const startUtc = (ev.start as Record<string, string> | undefined)?.utc;
    if (!name || !startUtc) return null;
    const venue = ev.venue as Record<string, unknown> | undefined;
    const venueName = (venue?.name as string | undefined) || "";
    const venueAddr = ((venue?.address as Record<string, string> | undefined)?.localized_address_display) || "Austin, TX";
    const desc = ((ev.description as Record<string, string> | undefined)?.text || "").substring(0, 400)
      || `${name} at ${venueName || venueAddr}`;
    return {
      title: name.trim(),
      date: formatIsoEventDate(startUtc),
      venue: venueName ? `${venueName}, ${venueAddr}`.substring(0, 120) : venueAddr,
      description: desc,
      link: (ev.url as string | undefined) || null,
      imageUrl: ((ev.logo as Record<string, string> | undefined)?.url) || null,
      category: categorizEvent(name, desc),
      source: "Eventbrite",
      featured: false,
    };
  } catch (err) {
    logger.warn({ eventId, err }, "Eventbrite API fetch failed");
    return null;
  }
}

// --- Eventbrite: parse a single event page via JSON-LD / og: tags in <head> ---
async function extractEventbriteEventFromPage(url: string): Promise<EventItem | null> {
  try {
    const html = await fetchRawHtml(url);

    // Try JSON-LD first (most structured)
    const ld = extractJsonLdEvent(html);
    if (ld) {
      const title = (ld["name"] as string | undefined) || extractOgMeta(html, "title");
      const startDate = ld["startDate"] as string | undefined;
      const location = ld["location"] as Record<string, unknown> | undefined;
      const venueName = (location?.["name"] as string | undefined) || "";
      const venueAddr = ((location?.["address"] as Record<string, unknown> | undefined)?.["streetAddress"] as string | undefined)
        || "Austin, TX";
      const desc = (ld["description"] as string | undefined)?.substring(0, 400)
        || extractOgMeta(html, "description");
      const image = (ld["image"] as string | string[] | undefined);
      const imageUrl = Array.isArray(image) ? image[0] : (image || extractOgMeta(html, "image") || null);
      if (title) {
        return {
          title: title.trim(),
          date: startDate ? formatIsoEventDate(startDate) : "",
          venue: venueName ? `${venueName}, ${venueAddr}`.substring(0, 120) : venueAddr,
          description: desc || title,
          link: url,
          imageUrl: imageUrl || null,
          category: categorizEvent(title, desc || ""),
          source: "Eventbrite",
          featured: false,
        };
      }
    }

    // Fall back to og: tags
    const title = extractOgMeta(html, "title");
    const desc = extractOgMeta(html, "description");
    const image = extractOgMeta(html, "image");
    if (title) {
      return {
        title: title.replace(/ \| Eventbrite$/i, "").trim(),
        date: "",
        venue: "Austin, TX",
        description: desc || title,
        link: url,
        imageUrl: image || null,
        category: categorizEvent(title, desc),
        source: "Eventbrite",
        featured: false,
      };
    }
  } catch (err) {
    logger.warn({ url, err }, "Eventbrite page parse failed");
  }
  return null;
}

// Fallback for JavaScript-rendered pages: routes the request through a free
// headless-rendering reader proxy (r.jina.ai) that executes the page's JS and
// returns the hydrated content as plain text/markdown.
async function fetchRenderedPageText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      signal: controller.signal,
      headers: {
        "Accept": "text/plain",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return text.trim();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPageText(url: string): Promise<string> {
  const forceJina = isJsHeavyDomain(url);
  let text = "";

  if (!forceJina) {
    try {
      const html = await fetchRawHtml(url);
      text = htmlToText(html);
    } catch (err) {
      logger.warn({ url, err }, "Raw fetch failed, falling back to rendered fetch");
    }
  }

  if (forceJina || text.length < THIN_TEXT_THRESHOLD) {
    try {
      const rendered = await fetchRenderedPageText(url);
      if (rendered.length > text.length) {
        text = rendered;
      }
    } catch (err) {
      logger.warn({ url, err }, "Rendered fallback fetch failed");
    }
  }

  if (!text) {
    throw new Error("Failed to fetch page content via raw or rendered fetch");
  }

  return text.slice(0, 12000);
}

// Returns exactly one of the 5 display categories: Tech, Arts, Sports, Civics, Wellness
function categorizEvent(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  if (/tech|startup|ai\b|developer|coding|hackathon|founder|product|saas|software/.test(text)) return "Tech";
  if (/yoga|meditation|mindfulness|pilates|wellness|health retreat/.test(text)) return "Wellness";
  if (/fitness|run|hike|bike|swim|outdoor|nature|sport|cycling|crossfit/.test(text)) return "Sports";
  if (/community|volunteer|civic|neighborhood|nonprofit|charity/.test(text)) return "Civics";
  return "Arts";
}

export interface ExtractedSourceResult {
  url: string;
  events: EventItem[];
  error?: string;
}

export async function extractEventsFromUrl(url: string, weekOf: Date): Promise<ExtractedSourceResult> {
  const { start, end } = getWeekBounds(weekOf);
  const weekLabel = `${formatDate(start)} through ${formatDate(end)}`;

  // --- Special case: Eventbrite single-event URL ---
  const ebSingleMatch = url.match(/eventbrite\.com\/e\/[^/?#]+-(\d{8,})/i);
  if (ebSingleMatch) {
    const eventId = ebSingleMatch[1];

    // Try API first if token available
    const apiEvent = await fetchEventbriteById(eventId);
    if (apiEvent) {
      logger.info({ url, eventId }, "Extracted Eventbrite event via API");
      return { url, events: [apiEvent] };
    }

    // Fallback: parse JSON-LD / og: tags from page HTML
    const pageEvent = await extractEventbriteEventFromPage(url);
    if (pageEvent) {
      logger.info({ url }, "Extracted Eventbrite event via page metadata");
      return { url, events: [pageEvent] };
    }

    logger.warn({ url }, "Eventbrite single-event extraction failed, falling through to AI");
  }

  let pageText: string;
  try {
    pageText = await fetchPageText(url);
  } catch (err) {
    logger.warn({ url, err }, "Failed to fetch URL for event extraction");
    return { url, events: [], error: `Failed to fetch page: ${err}` };
  }

  const prompt = `You are an event extraction assistant. Given the text content from an event website or calendar page, extract all events that fall within the week of ${weekLabel} (Sunday through Saturday inclusive).

SOURCE URL: ${url}

PAGE TEXT:
${pageText}

Instructions:
- Extract only events happening during ${weekLabel}.
- For each event, find the most specific event page URL you can. If an event has its own URL, use that. Otherwise use the source URL: ${url}
- Format dates as: "DayOfWeek, Mon DD at H:MM AM/PM" (e.g. "Wednesday, Jul 2 at 7:00 PM")
- If no specific time is mentioned, use "12:00 PM"
- Categories must be one of: Tech & Business, Music, Food & Markets, Arts & Culture, Outdoors & Fitness, Community
- Only include events with a clear title and date
- Return valid JSON only — no markdown, no explanation

Return a JSON array like:
[
  {
    "title": "Event Name",
    "date": "Wednesday, Jul 2 at 7:00 PM",
    "venue": "Venue Name or Address",
    "description": "2-3 sentence description of the event",
    "link": "https://specific-event-page-url-or-source-url",
    "category": "Tech & Business",
    "source": "${url}"
  }
]

If no events are found for this week, return an empty array: []`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 3000,
    });

    const raw = response.choices[0]?.message?.content?.trim() || "[]";
    const jsonStr = raw.startsWith("[") ? raw : raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1);
    const parsed = JSON.parse(jsonStr) as Array<Record<string, unknown>>;

    const events: EventItem[] = parsed.map((e) => ({
      title: String(e.title || "Untitled Event"),
      date: String(e.date || ""),
      venue: String(e.venue || ""),
      description: String(e.description || ""),
      link: typeof e.link === "string" && e.link.startsWith("http") ? e.link : url,
      category: categorizEvent(String(e.title || ""), String(e.description || "")),
      imageUrl: null,
      source: url,
      featured: false,
    }));

    logger.info({ url, found: events.length }, "Extracted events from URL");
    return { url, events };
  } catch (err) {
    logger.warn({ url, err }, "Failed to extract events from URL with AI");
    return { url, events: [], error: `AI extraction failed: ${err}` };
  }
}

export async function extractEventsFromSources(urls: string[], weekOf: Date): Promise<{ events: EventItem[]; results: ExtractedSourceResult[] }> {
  const validUrls = urls.filter(u => u && u.startsWith("http"));
  if (validUrls.length === 0) return { events: [], results: [] };

  const results = await Promise.all(validUrls.map(url => extractEventsFromUrl(url, weekOf)));

  const seen = new Set<string>();
  const events: EventItem[] = [];
  for (const r of results) {
    for (const e of r.events) {
      const key = e.title.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        events.push(e);
      }
    }
  }

  return { events, results };
}
