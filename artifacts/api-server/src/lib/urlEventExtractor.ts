import OpenAI from "openai";
import type { EventItem } from "@workspace/db";
import { logger } from "./logger";

const client = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

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

async function fetchRawHtmlText(url: string): Promise<string> {
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
    const html = await res.text();
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
  } finally {
    clearTimeout(timeout);
  }
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
  let text = "";
  try {
    text = await fetchRawHtmlText(url);
  } catch (err) {
    logger.warn({ url, err }, "Raw fetch failed, falling back to rendered fetch");
  }

  if (text.length < THIN_TEXT_THRESHOLD) {
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

function categorizEvent(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  if (/tech|startup|ai|developer|coding|hackathon|meetup|founder|product|saas|software/.test(text)) return "Tech & Business";
  if (/music|concert|band|live|jazz|blues|country|rock|indie|dj|festival/.test(text)) return "Music";
  if (/food|restaurant|dining|tasting|farmers market|brunch|coffee|beer|wine|cocktail|bar/.test(text)) return "Food & Markets";
  if (/art|gallery|museum|film|theater|theatre|comedy|improv|poetry|culture|exhibition/.test(text)) return "Arts & Culture";
  if (/yoga|fitness|run|hike|bike|swim|outdoor|nature|wellness|meditation|park/.test(text)) return "Outdoors & Fitness";
  if (/community|volunteer|civic|neighborhood|nonprofit|charity|social|networking/.test(text)) return "Community";
  return "Community";
}

export interface ExtractedSourceResult {
  url: string;
  events: EventItem[];
  error?: string;
}

export async function extractEventsFromUrl(url: string, weekOf: Date): Promise<ExtractedSourceResult> {
  const { start, end } = getWeekBounds(weekOf);
  const weekLabel = `${formatDate(start)} through ${formatDate(end)}`;

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
