import { Router, type IRouter } from "express";
import { db, digestsTable, subscribersTable, type EventItem, EventItemSchema } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import {
  GenerateDigestBody,
  SendDigestBody,
  GetLatestDigestResponse,
  ListDigestsResponse,
  GenerateDigestResponse,
  SendDigestResponse,
} from "@workspace/api-zod";
import { generateSampleDigest, getStLouisSampleDigest, getNextSunday } from "../lib/digestGenerator";
import { sendEmail, buildDigestEmailHtml, translateEventsForEmail } from "../lib/emailService";
import { fetchEventsFromGmail, isEmailReaderConfigured, debugFetchEmails } from "../lib/emailReader";
import { fetchEventsForTenant, deduplicateEvents, filterByTenantCategories } from "../lib/eventSources";
import { isAdultContent } from "../lib/contentFilter";
import { buildCommunityEvents } from "../lib/weeklyRefresh";
import { requireAdmin } from "../middleware/requireAdmin";
import { awardXP } from "../lib/gamification";
import { extractEventsFromSources } from "../lib/urlEventExtractor";
import { geocodeAndPatchDigest, geocodeEvents, geocodeVenue } from "../lib/geocodeVenue";
import { safeOutboundFetch } from "../lib/safeOutboundFetch";
import { prewarmTranslationCache } from "../lib/translationPrewarm";
import { signSubscriberToken } from "../lib/subscriberToken";

const router: IRouter = Router();

/**
 * Automatically marks events as featured (Special Event) when their date falls
 * beyond the digest's Saturday (weekOf + 6 days). Spotlights and already-featured
 * events are left unchanged.
 */
function autoTagFutureEvents(events: EventItem[], weekOf: Date): EventItem[] {
  const MONTH_IDX: Record<string, number> = {
    Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11,
  };
  const weekEnd = new Date(weekOf.getTime() + 6 * 24 * 60 * 60 * 1000);
  weekEnd.setHours(23, 59, 59, 999);

  return events.map(event => {
    if (event.featured || (event as any).isBusinessSpotlight || (event as any).isPost) return event;
    const dateStr = ((event as any).date as string) || "";
    const m = dateStr.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})/i);
    if (!m) return event;
    const key = (m[1] as string).substring(0, 3);
    const mo = MONTH_IDX[key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()];
    if (mo === undefined) return event;
    const day = parseInt(m[2] as string, 10);
    const eventDate = new Date(weekOf.getFullYear(), mo, day);
    // Handle year rollover (e.g. Dec digest referencing Jan event)
    if (eventDate < weekOf) eventDate.setFullYear(weekOf.getFullYear() + 1);
    if (eventDate > weekEnd) return { ...event, featured: true } as EventItem;
    return event;
  });
}

/**
 * Pulls featured (Special Event) entries from the most recent existing digest for
 * this tenant whose dates fall on or after weekOf. These are manually-curated events
 * that live adapters (Ticketmaster, Gmail, etc.) never return — multi-week shows,
 * conferences, or anything added by hand to a previous digest. They would be silently
 * dropped when a new digest is generated without this step.
 */
async function carryForwardFeaturedEvents(tenantId: number, weekOf: Date): Promise<EventItem[]> {
  const MONTH_IDX: Record<string, number> = {
    Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11,
  };

  const [prev] = await db
    .select({ events: digestsTable.events })
    .from(digestsTable)
    .where(eq(digestsTable.tenantId, tenantId))
    .orderBy(desc(digestsTable.weekOf), desc(digestsTable.id))
    .limit(1);

  if (!prev) return [];

  const featured = ((prev.events as any[]) || []).filter((e: any) => e.featured === true);

  // Only keep events whose date is still >= the new weekOf
  return featured.filter((ev: any) => {
    const dateStr = String(ev.date || "");
    const m = dateStr.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})/i);
    if (!m) return false;
    const key = (m[1] as string).substring(0, 3);
    const cap = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
    const mo = MONTH_IDX[cap];
    if (mo === undefined) return false;
    const eventDate = new Date(weekOf.getFullYear(), mo, parseInt(m[2] as string, 10));
    // Handle year rollover (e.g. Dec digest carrying Jan events)
    if (eventDate < weekOf) eventDate.setFullYear(weekOf.getFullYear() + 1);
    return eventDate >= weekOf;
  }) as EventItem[];
}

/**
 * Per-tenant category restriction. Returns only events whose category is in the
 * tenant's allowed list. If no restriction is configured, all events pass through.
 */
function applyTenantCategoryRestriction(tenantSlug: string, events: EventItem[]): EventItem[] {
  // AustinCares was previously restricted to Civics + Wellness (events site).
  // It is now a weekly deals site — no category restriction applies; all categories allowed.
  const RESTRICTIONS: Record<string, string[]> = {};
  const allowed = RESTRICTIONS[tenantSlug];
  if (!allowed) return events;
  return events.filter(e => allowed.includes(e.category));
}

const MONTH_IDX_CLEANUP: Record<string, number> = {
  Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11,
};

/**
 * Strips a leading "Hey [City]!" / "Hey [City]," greeting from a digest intro.
 * The email template already renders its own greeting, so storing the opener
 * causes it to appear twice whenever a digest is regenerated.
 *
 * Matches: "Hey Austin!" / "Hey Austin," / "Hey St. Louis! " etc.
 * Case-insensitive; trims any trailing whitespace left after removal.
 */
function stripGreeting(intro: string): string {
  return intro.replace(/^Hey [^!,\n]+[!,]\s*/i, "").trimStart();
}

/**
 * Filters out past events from a digest's event list before serving to clients.
 * Never removes spotlights, community posts, or featured (Special Event) entries.
 * Applied in digestToApi so all cities are covered regardless of sent status.
 */
function filterStaleEvents(events: any[]): any[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return events.filter(ev => {
    // Community posts and spotlights have no event date — always keep
    if (ev.isPost || ev.isBusinessSpotlight) return true;
    // No date string → keep (can't determine staleness)
    if (!ev.date) return true;
    const m = String(ev.date).match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})/i);
    if (!m) return true; // can't parse date → keep
    const key = m[1].substring(0, 3);
    const cap = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
    const month = MONTH_IDX_CLEANUP[cap];
    if (month === undefined) return true;
    const eventDate = new Date(today.getFullYear(), month, parseInt(m[2], 10));
    // Handle year rollover (e.g. Dec digest referencing Jan event)
    if (today.getMonth() <= 1 && month >= 10) eventDate.setFullYear(today.getFullYear() - 1);
    return eventDate >= today;
    // Note: featured ("Special Events") are intentionally NOT exempt — a featured
    // event with a past date is still stale and should be removed.
  });
}

function digestToApi(d: typeof digestsTable.$inferSelect) {
  // Apply both stale-event and adult-content filters before serving to any client
  const staleFiltered = filterStaleEvents((d.events as any[]) || []);
  const clean = staleFiltered.filter((e: any) => !isAdultContent(e.title ?? "", e.description ?? ""));
  return {
    id: d.id,
    weekOf: d.weekOf,
    subject: d.subject,
    intro: d.intro,
    events: clean,
    sentAt: d.sentAt,
    sentCount: d.sentCount,
    createdAt: d.createdAt,
  };
}

router.get("/digest/latest", async (req, res) => {
  try {
    const [latest] = await db
      .select()
      .from(digestsTable)
      .where(eq(digestsTable.tenantId, req.tenant!.id))
      .orderBy(desc(digestsTable.weekOf), desc(digestsTable.id))
      .limit(1);

    if (!latest) {
      res.status(404).json({ error: "not_found", message: "No digest found" });
      return;
    }

    const response = GetLatestDigestResponse.parse({ digest: digestToApi(latest) });
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Error fetching latest digest");
    res.status(500).json({ error: "server_error", message: "Failed to fetch digest" });
  }
});

router.get("/digest/list", async (req, res) => {
  try {
    const digests = await db
      .select()
      .from(digestsTable)
      .where(eq(digestsTable.tenantId, req.tenant!.id))
      .orderBy(desc(digestsTable.weekOf));

    const response = ListDigestsResponse.parse({
      digests: digests.map(digestToApi),
    });
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Error listing digests");
    res.status(500).json({ error: "server_error", message: "Failed to list digests" });
  }
});

router.post("/digest/generate", requireAdmin, async (req, res) => {
  const parseResult = GenerateDigestBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "invalid_request", message: "Invalid request body" });
    return;
  }

  const { weekOf: weekOfStr, customNotes } = parseResult.data;
  // weekEnd is not in the Zod schema (admin-only extension) — read directly
  const weekEndStr = (req.body as Record<string, unknown>)?.weekEnd as string | undefined;

  try {
    const weekOf = weekOfStr ? new Date(weekOfStr) : getNextSunday();
    const weekEnd = weekEndStr ? new Date(weekEndStr) : undefined;

    let subject: string;
    let intro: string;
    let events: EventItem[];

    const dateRange = (() => {
      const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" };
      const end = new Date(weekOf); end.setDate(end.getDate() + 6);
      return `${weekOf.toLocaleDateString("en-US", opts)}–${end.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
    })();
    const fallback = req.tenant!.slug === "stlouis"
      ? getStLouisSampleDigest(dateRange)
      : generateSampleDigest(weekOf, customNotes || undefined, req.tenant!);

    // Run category-based adapters for this tenant's configured categories (primary source)
    const adapterResult = await fetchEventsForTenant({ tenant: req.tenant!, weekOf, weekEnd });
    let combinedEvents: EventItem[] = [...adapterResult.events];
    let gmailIntro = "";

    // Gmail reader is a supplemental adapter (Austin-specific newsletter inbox)
    if (isEmailReaderConfigured()) {
      req.log.info("Gmail configured — supplementing with inbox newsletters");
      const since = new Date(weekOf);
      since.setDate(since.getDate() - 14);
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const rangeEnd = weekEnd || new Date(weekOf.getTime() + 7 * 24 * 60 * 60 * 1000);
      const isPastRange = rangeEnd < twoWeeksAgo;
      const before = isPastRange ? rangeEnd : undefined;

      try {
        const gmailResult = await fetchEventsFromGmail(since, before, weekOf, weekEnd);
        req.log.info(
          { emails: gmailResult.emails, events: gmailResult.events.length, weekFiltered: gmailResult.weekFiltered },
          "Gmail supplement result"
        );
        if (gmailResult.weekFiltered && gmailResult.events.length > 0) {
          // Filter adult content from Gmail-parsed events before merging
          const cleanGmailEvents = gmailResult.events.filter(
            (e: EventItem) => !isAdultContent(e.title, e.description ?? ""),
          );
          combinedEvents = [...combinedEvents, ...cleanGmailEvents];
          gmailIntro = gmailResult.intro;
        }
      } catch (err) {
        req.log.warn({ err }, "Gmail supplement failed — continuing without Gmail events");
      }
    }

    // Deduplicate merged events from all sources, then filter to tenant's categories
    const tenantCategories = (req.tenant!.categories as string[]) || [];
    const deduped = deduplicateEvents(combinedEvents);
    const mergedEvents = filterByTenantCategories(deduped, tenantCategories);

    // Build subject line
    if (weekEnd) {
      const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" };
      const inclusiveEnd = new Date(weekEnd.getTime() - 86400000);
      const label = `${weekOf.toLocaleDateString("en-US", opts)}–${inclusiveEnd.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
      const _s = req.tenant!.slug;
      const subjectEmoji = _s === "austincares" ? "🏷️" : _s === "stlouis" ? "⚾" : _s === "sacramento" ? "👑" : _s === "portland" ? "🌲" : _s === "bulverde" || _s === "brushycreek" ? "🌿" : _s === "tokyo" ? "🗼" : "🤠";
      subject = `${subjectEmoji} ${req.tenant!.digestTitle || `${req.tenant!.city} Events`}: ${label}`;
    } else {
      subject = fallback.subject;
    }

    // Always supplement with curated community events for this city (recurring local spots,
    // markets, parks, meetups). Merged in REGARDLESS of adapter results so that
    // Ticketmaster / external-API events never overwrite them.
    const nextWeekStart = new Date(weekOf.getTime() + 7 * 24 * 60 * 60 * 1000);
    const communityEvts = buildCommunityEvents(req.tenant!.slug, weekOf, nextWeekStart);

    if (mergedEvents.length > 0 || communityEvts.length > 0) {
      events = deduplicateEvents([...mergedEvents, ...communityEvts]);
      // Gmail intro is Austin-specific — never use it for other cities
      const introBase = stripGreeting((req.tenant!.slug === "austin" && gmailIntro) ? gmailIntro : fallback.intro);
      intro = customNotes ? `${introBase}\n\n${customNotes}` : introBase;
      req.log.info(
        { adapterEvents: adapterResult.events.length, communityEvents: communityEvts.length, sources: adapterResult.sources, total: events.length },
        "Digest populated from discovered + community events"
      );
    } else {
      // For Austin and St. Louis, fall back to curated sample events so the
      // digest is never blank. For every other city (Tokyo, Sacramento, etc.)
      // create an empty draft instead — Austin-themed placeholder events
      // (Barton Springs, South Congress, ACL Live …) must never appear under
      // a foreign city's brand.
      const isAustinFamily = req.tenant!.slug === "austin" || req.tenant!.slug === "stlouis";
      events = isAustinFamily ? fallback.events : [];
      intro = customNotes ? `${stripGreeting(fallback.intro)}\n\n${customNotes}` : stripGreeting(fallback.intro);
      req.log.info(
        { weekOf: weekOf.toISOString().substring(0, 10), tenant: req.tenant!.slug, usedSample: isAustinFamily },
        isAustinFamily
          ? "No events discovered from any source — using sample digest data"
          : "No events discovered from any source — creating empty draft (non-Austin tenant)"
      );
    }

    // Carry forward manually-curated featured events from the most recent previous
    // digest (multi-week shows, conferences, anything added by hand). Live adapter
    // events come first so deduplicateEvents keeps their version on title+date collisions.
    const carried = await carryForwardFeaturedEvents(req.tenant!.id, weekOf);
    const eventsWithCarried = carried.length > 0
      ? deduplicateEvents([...events, ...carried] as EventItem[])
      : events as EventItem[];
    if (carried.length > 0) {
      req.log.info({ carried: carried.map((e: EventItem) => e.title) }, "Carried forward featured events from previous digest");
    }

    const taggedEvents = autoTagFutureEvents(
      applyTenantCategoryRestriction(req.tenant!.slug, eventsWithCarried)
        .filter((e: EventItem) => !isAdultContent(e.title, e.description ?? "")),
      weekOf,
    );

    const [digest] = await db
      .insert(digestsTable)
      .values({
        tenantId: req.tenant!.id,
        weekOf,
        subject,
        intro,
        events: taggedEvents,
        sentCount: 0,
      })
      .returning();

    const response = GenerateDigestResponse.parse({ digest: digestToApi(digest) });
    res.json(response);

    // Geocode venue coordinates in the background (fire-and-forget)
    geocodeAndPatchDigest(digest.id, taggedEvents as Array<Record<string, unknown>>).catch(() => {});

    // Award XP for each event in the digest and update the weekly streak (fire-and-forget)
    const eventCount = events.length;
    if (eventCount > 0) {
      // updateStreak is called inside awardXP for "digest_event" before badge check.
      awardXP(req.tenant!.id, "digest_event", eventCount * 5, { digestId: digest.id, eventCount }).catch(() => {});
    }
  } catch (err) {
    req.log.error({ err }, "Error generating digest");
    res.status(500).json({ error: "server_error", message: "Failed to generate digest" });
  }
});

/**
 * Normalises an incoming event object before writing it to the DB.
 *
 * Spotlights and community posts legitimately have no date/venue/category/
 * description, but EventItemSchema requires those fields as strings.  Filling
 * in empty-string defaults here means the Zod parse on read never throws and
 * can never take a city page offline.
 *
 * Regular events are validated strictly; a validation failure returns the raw
 * Zod issues to the caller so they know exactly which field is wrong.
 */
function normaliseEventForStorage(raw: unknown): { ok: true; event: EventItem } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Event must be an object" };
  }
  const e = raw as Record<string, unknown>;
  const isSpotlightOrPost = e["isBusinessSpotlight"] === true || e["isPost"] === true;

  if (isSpotlightOrPost) {
    // Auto-fill required string fields with safe defaults so reads never throw
    const filled = {
      ...e,
      date: typeof e["date"] === "string" ? e["date"] : "",
      venue: typeof e["venue"] === "string" ? e["venue"] : "",
      description: typeof e["description"] === "string" ? e["description"] : "",
      category: typeof e["category"] === "string" ? e["category"]
        : e["isBusinessSpotlight"] ? "Business" : "Community",
    };
    const result = EventItemSchema.safeParse(filled);
    if (!result.success) {
      return { ok: false, error: result.error.issues.map(i => i.message).join("; ") };
    }
    return { ok: true, event: result.data };
  }

  // Regular event — validate strictly
  const result = EventItemSchema.safeParse(e);
  if (!result.success) {
    return { ok: false, error: result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }
  return { ok: true, event: result.data };
}

router.patch("/digest/:id/events", requireAdmin, async (req, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_request", message: "Invalid digest id" });
    return;
  }
  const { events } = req.body || {};
  if (!Array.isArray(events) || events.length === 0) {
    res.status(400).json({ error: "invalid_request", message: "events[] is required" });
    return;
  }

  // Normalise / validate every event before touching the DB
  const normalised: EventItem[] = [];
  for (let i = 0; i < events.length; i++) {
    const result = normaliseEventForStorage(events[i]);
    if (!result.ok) {
      res.status(400).json({
        error: "invalid_event",
        message: `Event at index ${i} failed validation: ${result.error}`,
      });
      return;
    }
    normalised.push(result.event);
  }

  try {
    const [existing] = await db
      .select({ weekOf: digestsTable.weekOf })
      .from(digestsTable)
      .where(and(eq(digestsTable.id, id), eq(digestsTable.tenantId, req.tenant!.id)))
      .limit(1);
    const taggedEvents = existing
      ? autoTagFutureEvents(applyTenantCategoryRestriction(req.tenant!.slug, normalised), new Date(existing.weekOf))
      : applyTenantCategoryRestriction(req.tenant!.slug, normalised);
    const [updated] = await db
      .update(digestsTable)
      .set({ events: taggedEvents })
      .where(and(eq(digestsTable.id, id), eq(digestsTable.tenantId, req.tenant!.id)))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Digest not found" });
      return;
    }
    res.json({ success: true, digest: digestToApi(updated) });
    // Geocode any events that are missing coordinates (fire-and-forget)
    geocodeAndPatchDigest(id, taggedEvents as Array<Record<string, unknown>>).catch(() => {});
  } catch (err) {
    req.log.error({ err }, "Error updating digest events");
    res.status(500).json({ error: "server_error", message: "Failed to update digest events" });
  }
});

router.patch("/digest/:id/intro", requireAdmin, async (req, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_request", message: "Invalid digest id" });
    return;
  }
  const { intro } = req.body || {};
  if (typeof intro !== "string" || !intro.trim()) {
    res.status(400).json({ error: "invalid_request", message: "intro string is required" });
    return;
  }
  try {
    const [updated] = await db
      .update(digestsTable)
      .set({ intro: intro.trim() })
      .where(and(eq(digestsTable.id, id), eq(digestsTable.tenantId, req.tenant!.id)))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Digest not found" });
      return;
    }
    res.json({ success: true, digest: digestToApi(updated) });
  } catch (err) {
    req.log.error({ err }, "Error updating digest intro");
    res.status(500).json({ error: "server_error", message: "Failed to update digest intro" });
  }
});

router.patch("/digest/:id/meta", requireAdmin, async (req, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_request", message: "Invalid digest id" });
    return;
  }
  const { subject, weekOf } = req.body || {};
  const updates: Record<string, unknown> = {};
  if (typeof subject === "string" && subject.trim()) updates.subject = subject.trim();
  if (typeof weekOf === "string" && weekOf.trim()) updates.weekOf = new Date(weekOf.trim());
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "invalid_request", message: "At least one of subject, weekOf is required" });
    return;
  }
  try {
    const [updated] = await db
      .update(digestsTable)
      .set(updates)
      .where(and(eq(digestsTable.id, id), eq(digestsTable.tenantId, req.tenant!.id)))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Digest not found" });
      return;
    }
    res.json({ success: true, digest: digestToApi(updated) });
  } catch (err) {
    req.log.error({ err }, "Error updating digest meta");
    res.status(500).json({ error: "server_error", message: "Failed to update digest meta" });
  }
});

// Fetch basic og:/JSON-LD metadata from a URL for spotlight entries
async function fetchUrlMeta(url: string): Promise<{ title: string; description: string; imageUrl: string | null }> {
  try {
    const res = await safeOutboundFetch(url, { timeoutMs: 10000 });
    if (!res.ok) return { title: "", description: "", imageUrl: null };
    const html = await res.text();
    const og = (prop: string) => {
      const m = html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, "i"))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, "i"));
      return m ? m[1].trim() : "";
    };
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    // Decode HTML entities that HTML parsers may leave in attribute values (e.g. &amp; → &)
    const rawImageUrl = og("image") || null;
    return {
      title: og("title") || (titleTag ? titleTag[1].trim() : ""),
      description: og("description"),
      imageUrl: rawImageUrl ? rawImageUrl.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"') : null,
    };
  } catch {
    return { title: "", description: "", imageUrl: null };
  }
}

router.post("/digest/:id/spotlight", requireAdmin, async (req, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_request", message: "Invalid digest id" });
    return;
  }
  const { url, type, title: titleOverride, description: descOverride, deadline, date, venue, category } = req.body || {};
  if (typeof url !== "string" || !url.startsWith("http")) {
    res.status(400).json({ error: "invalid_request", message: "url is required and must start with http" });
    return;
  }
  if (type !== "business" && type !== "community" && type !== "event") {
    res.status(400).json({ error: "invalid_request", message: "type must be 'business', 'community', or 'event'" });
    return;
  }
  try {
    const [existing] = await db
      .select()
      .from(digestsTable)
      .where(and(eq(digestsTable.id, id), eq(digestsTable.tenantId, req.tenant!.id)))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "not_found", message: "Digest not found" });
      return;
    }

    const meta = await fetchUrlMeta(url);
    const title = (typeof titleOverride === "string" && titleOverride.trim()) ? titleOverride.trim() : meta.title;
    const description = (typeof descOverride === "string" && descOverride.trim()) ? descOverride.trim() : meta.description;

    const { featured: featuredRaw } = req.body || {};
    const spotlight: EventItem = type === "event" ? {
      title: title || url,
      date: (typeof date === "string" && date.trim()) ? date.trim() : "",
      venue: (typeof venue === "string" && venue.trim()) ? venue.trim() : "",
      description: description || "",
      link: url,
      imageUrl: meta.imageUrl,
      category: (typeof category === "string" && category.trim()) ? category.trim() : "Community",
      source: url,
      featured: featuredRaw === true || featuredRaw === "true",
    } as EventItem : {
      title: title || url,
      date: "",
      venue: "",
      description: description || "",
      link: url,
      imageUrl: meta.imageUrl,
      category: type === "business" ? "Tech & Business" : "Community",
      source: url,
      featured: false,
      ...(type === "business" ? { isBusinessSpotlight: true } : { isPost: true }),
      ...(type === "community" && typeof deadline === "string" && deadline.trim() ? { deadline: deadline.trim() } : {}),
    } as EventItem;

    const currentEvents = (existing.events as EventItem[]) || [];
    const updatedEvents = autoTagFutureEvents([...currentEvents, spotlight], new Date(existing.weekOf));

    const [updated] = await db
      .update(digestsTable)
      .set({ events: updatedEvents })
      .where(and(eq(digestsTable.id, id), eq(digestsTable.tenantId, req.tenant!.id)))
      .returning();

    req.log.info({ digestId: id, type, url }, "Spotlight added to digest");
    res.json({ success: true, digest: digestToApi(updated) });
  } catch (err) {
    req.log.error({ err }, "Error adding spotlight to digest");
    res.status(500).json({ error: "server_error", message: "Failed to add spotlight" });
  }
});

// ---------------------------------------------------------------------------
// Parse a single event URL and return structured fields for the admin form
// ---------------------------------------------------------------------------
router.post("/digest/:id/parse-event-url", requireAdmin, async (req, res) => {
  const { url } = req.body || {};
  if (typeof url !== "string" || !url.startsWith("http")) {
    res.status(400).json({ error: "invalid_request", message: "url is required" });
    return;
  }
  try {
    let html = "";
    try {
      const pageRes = await safeOutboundFetch(url, { timeoutMs: 12000 });
      if (pageRes.ok) html = await pageRes.text();
    } catch { /* fall through to og fallback */ }

    // Try JSON-LD Schema.org Event first
    const jldRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let jldParsed: Record<string, unknown> | null = null;
    for (const m of html.matchAll(jldRe)) {
      try {
        const d = JSON.parse(m[1]) as Record<string, unknown>;
        const t = d["@type"];
        if (t === "Event" || t === "MusicEvent" || t === "SportsEvent" || t === "SocialEvent") {
          jldParsed = d; break;
        }
      } catch { /* skip malformed */ }
    }

    let title = "", date = "", venue = "", description = "", imageUrl: string | null = null;

    if (jldParsed) {
      title = String(jldParsed["name"] || "");
      description = typeof jldParsed["description"] === "string"
        ? jldParsed["description"].replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").slice(0, 400)
        : "";
      const img = jldParsed["image"];
      imageUrl = Array.isArray(img) ? String(img[0]) : (typeof img === "string" ? img : null);

      // Parse startDate into human-readable format
      if (jldParsed["startDate"]) {
        try {
          const d = new Date(String(jldParsed["startDate"]));
          if (!isNaN(d.getTime())) {
            const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
            const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
            const hr = d.getHours(), min = String(d.getMinutes()).padStart(2, "0");
            const ampm = hr >= 12 ? "PM" : "AM";
            const hr12 = hr % 12 || 12;
            date = `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()} at ${hr12}:${min} ${ampm}`;
          }
        } catch { /* ignore */ }
      }

      // Extract venue from location
      const loc = jldParsed["location"] as Record<string, unknown> | string | undefined;
      if (typeof loc === "string") {
        venue = loc;
      } else if (loc && typeof loc === "object") {
        const locName = String((loc as any)["name"] || "");
        const addr = (loc as any)["address"] as Record<string, unknown> | string | undefined;
        const street = typeof addr === "string" ? addr : String((addr as any)?.["streetAddress"] || "");
        const city   = typeof addr === "object" ? String((addr as any)?.["addressLocality"] || "") : "";
        const state  = typeof addr === "object" ? String((addr as any)?.["addressRegion"] || "") : "";
        venue = [locName, street, city, state].filter(Boolean).join(", ");
      }
    }

    // Fallback to og/meta tags
    if (!title || !description) {
      const meta = await fetchUrlMeta(url);
      if (!title) title = meta.title;
      if (!description) description = meta.description;
      if (!imageUrl) imageUrl = meta.imageUrl;
    }

    res.json({ success: true, event: { title, date, venue, description, imageUrl, link: url } });
  } catch (err) {
    req.log.warn({ url, err }, "Failed to parse event URL");
    res.status(500).json({ error: "server_error", message: "Failed to parse URL" });
  }
});

// ---------------------------------------------------------------------------
// Scrape a single event URL and append it (with geocoding) to an existing digest
// POST /digest/:id/scrape-event
// Body: { url, title?, date?, venue?, description?, category?, featured?, imageUrl? }
// If title/description are omitted, the server fetches them from the URL.
// ---------------------------------------------------------------------------
router.post("/digest/:id/scrape-event", requireAdmin, async (req, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_request", message: "Invalid digest id" });
    return;
  }

  const {
    url,
    title: titleIn,
    date: dateIn,
    venue: venueIn,
    description: descIn,
    category: categoryIn,
    featured: featuredIn,
    imageUrl: imageUrlIn,
  } = req.body || {};

  // Basic format check — full SSRF validation (DNS resolution + redirect re-check) is
  // handled by safeOutboundFetch when the URL is actually fetched below.
  if (typeof url !== "string" || !url.startsWith("http")) {
    res.status(400).json({ error: "invalid_request", message: "url is required and must start with http" });
    return;
  }
  try { new URL(url); } catch {
    res.status(400).json({ error: "invalid_request", message: "url must be a valid URL" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(digestsTable)
      .where(and(eq(digestsTable.id, id), eq(digestsTable.tenantId, req.tenant!.id)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "not_found", message: "Digest not found" });
      return;
    }

    // Use provided fields or fall back to URL scrape
    let title = typeof titleIn === "string" && titleIn.trim() ? titleIn.trim() : "";
    let description = typeof descIn === "string" && descIn.trim() ? descIn.trim() : "";
    let imageUrl: string | null = typeof imageUrlIn === "string" && imageUrlIn.startsWith("http") ? imageUrlIn : null;

    if (!title || !description) {
      const meta = await fetchUrlMeta(url);
      if (!title) title = meta.title;
      if (!description) description = meta.description;
      if (!imageUrl) imageUrl = meta.imageUrl;
    }

    const date = typeof dateIn === "string" ? dateIn.trim() : "";
    const venue = typeof venueIn === "string" ? venueIn.trim() : "";
    const category = typeof categoryIn === "string" && categoryIn.trim() ? categoryIn.trim() : "Community";
    const featured = featuredIn === true || featuredIn === "true";

    // Geocode the venue synchronously so the event lands with coordinates
    let lat: number | null = null;
    let lng: number | null = null;
    if (venue) {
      const coords = await geocodeVenue(venue);
      lat = coords.lat;
      lng = coords.lng;
    }

    const event: EventItem = {
      title: title || url,
      date,
      venue,
      description,
      link: url,
      imageUrl,
      category,
      source: url,
      featured,
      ...(lat !== null ? { lat } : {}),
      ...(lng !== null ? { lng } : {}),
    } as EventItem;

    const currentEvents = (existing.events as EventItem[]) || [];
    const updatedEvents = autoTagFutureEvents([...currentEvents, event], new Date(existing.weekOf));

    await db
      .update(digestsTable)
      .set({ events: updatedEvents })
      .where(and(eq(digestsTable.id, id), eq(digestsTable.tenantId, req.tenant!.id)));

    req.log.info({ digestId: id, url, title: event.title, geocoded: lat !== null }, "Event scraped and added to digest");
    res.json({ success: true, event: { title: event.title, date, venue, lat, lng, category, featured } });
  } catch (err) {
    req.log.error({ err }, "Error scraping event for digest");
    res.status(500).json({ error: "server_error", message: "Failed to add event" });
  }
});

router.delete("/digest/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_request", message: "Invalid digest id" });
    return;
  }

  try {
    const deleted = await db
      .delete(digestsTable)
      .where(and(eq(digestsTable.id, id), eq(digestsTable.tenantId, req.tenant!.id)))
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: "not_found", message: "Digest not found" });
      return;
    }

    res.json({ success: true, message: "Digest deleted" });
  } catch (err) {
    req.log.error({ err }, "Error deleting digest");
    res.status(500).json({ error: "server_error", message: "Failed to delete digest" });
  }
});

// GET geocode coverage for a digest (Austin/admin only)
router.get("/digest/:id/geocode-coverage", requireAdmin, async (req, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_request", message: "Invalid digest id" });
    return;
  }
  try {
    const [digest] = await db
      .select()
      .from(digestsTable)
      .where(and(eq(digestsTable.id, id), eq(digestsTable.tenantId, req.tenant!.id)))
      .limit(1);
    if (!digest) {
      res.status(404).json({ error: "not_found", message: "Digest not found" });
      return;
    }
    const events = (digest.events as any[]) || [];
    // Only count events that have a venue — spotlights/posts with no venue can't be geocoded
    const withVenue = events.filter((e: any) => typeof e.venue === "string" && e.venue.trim());
    const geocoded = withVenue.filter((e: any) => e.lat != null && e.lng != null).length;
    const total = withVenue.length;
    res.json({ total, geocoded, missing: total - geocoded });
  } catch (err) {
    req.log.error({ err }, "Error fetching geocode coverage");
    res.status(500).json({ error: "server_error", message: "Failed to fetch geocode coverage" });
  }
});

// POST re-geocode missing events in a digest (fire-and-forget)
router.post("/digest/:id/regeocoded", requireAdmin, async (req, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_request", message: "Invalid digest id" });
    return;
  }
  try {
    const [digest] = await db
      .select()
      .from(digestsTable)
      .where(and(eq(digestsTable.id, id), eq(digestsTable.tenantId, req.tenant!.id)))
      .limit(1);
    if (!digest) {
      res.status(404).json({ error: "not_found", message: "Digest not found" });
      return;
    }
    const events = (digest.events as Array<Record<string, unknown>>) || [];
    // Fire-and-forget — geocodeEvents skips events that already have lat set
    geocodeAndPatchDigest(id, events).catch(() => {});
    res.json({ success: true, message: "Geocoding started" });
  } catch (err) {
    req.log.error({ err }, "Error starting re-geocode");
    res.status(500).json({ error: "server_error", message: "Failed to start re-geocode" });
  }
});

// PATCH /digest/:id/events/:idx — update individual fields on a single event (title, date, venue, category, description)
router.patch("/digest/:id/events/:idx", requireAdmin, async (req, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  const idx = parseInt(req.params["idx"] as string, 10);
  if (isNaN(id) || isNaN(idx)) {
    res.status(400).json({ error: "invalid_request", message: "Invalid digest id or event index" });
    return;
  }
  const body = (req.body || {}) as Record<string, unknown>;
  const allowedFields = ["title", "date", "venue", "category", "description"];
  const updates: Record<string, unknown> = {};
  for (const f of allowedFields) {
    if (typeof body[f] === "string") updates[f] = (body[f] as string).trim();
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "invalid_request", message: "At least one of title, date, venue, category, description is required" });
    return;
  }
  try {
    const [digest] = await db
      .select()
      .from(digestsTable)
      .where(and(eq(digestsTable.id, id), eq(digestsTable.tenantId, req.tenant!.id)))
      .limit(1);
    if (!digest) {
      res.status(404).json({ error: "not_found", message: "Digest not found" });
      return;
    }
    const events = (digest.events as Array<Record<string, unknown>>) || [];
    if (idx < 0 || idx >= events.length) {
      res.status(400).json({ error: "invalid_request", message: "Event index out of range" });
      return;
    }

    let updatedEvent: Record<string, unknown> = { ...events[idx], ...updates };

    // If venue changed, clear stale geocoords so they get refreshed
    if (updates["venue"] !== undefined && updates["venue"] !== events[idx]?.["venue"]) {
      delete updatedEvent["lat"];
      delete updatedEvent["lng"];
      // Geocode the new venue synchronously so the response includes fresh coords
      const geocoded = await geocodeEvents([updatedEvent]);
      updatedEvent = geocoded[0] ?? updatedEvent;
    }

    const finalEvents = [
      ...events.slice(0, idx),
      updatedEvent,
      ...events.slice(idx + 1),
    ];

    const taggedEvents = autoTagFutureEvents(finalEvents as EventItem[], new Date(digest.weekOf));

    const [updated] = await db
      .update(digestsTable)
      .set({ events: taggedEvents as any })
      .where(and(eq(digestsTable.id, id), eq(digestsTable.tenantId, req.tenant!.id)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Digest not found after update" });
      return;
    }

    req.log.info({ digestId: id, idx, fields: Object.keys(updates) }, "Event fields patched");
    res.json({ success: true, event: updatedEvent, digest: digestToApi(updated) });
  } catch (err) {
    req.log.error({ err }, "Error patching event fields");
    res.status(500).json({ error: "server_error", message: "Failed to update event" });
  }
});

// PATCH /digest/:id/events/:idx/venue — update a single event's venue and re-geocode it synchronously
router.patch("/digest/:id/events/:idx/venue", requireAdmin, async (req, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  const idx = parseInt(req.params["idx"] as string, 10);
  if (isNaN(id) || isNaN(idx)) {
    res.status(400).json({ error: "invalid_request", message: "Invalid digest id or event index" });
    return;
  }
  const { venue } = (req.body || {}) as { venue?: unknown };
  if (typeof venue !== "string" || !venue.trim()) {
    res.status(400).json({ error: "invalid_request", message: "venue string is required" });
    return;
  }
  try {
    const [digest] = await db
      .select()
      .from(digestsTable)
      .where(and(eq(digestsTable.id, id), eq(digestsTable.tenantId, req.tenant!.id)))
      .limit(1);
    if (!digest) {
      res.status(404).json({ error: "not_found", message: "Digest not found" });
      return;
    }
    const events = (digest.events as Array<Record<string, unknown>>) || [];
    if (idx < 0 || idx >= events.length) {
      res.status(400).json({ error: "invalid_request", message: "Event index out of range" });
      return;
    }

    // Preserve existing coordinates so we can fall back if geocoding the new venue fails
    const existingLat = events[idx]?.["lat"] ?? null;
    const existingLng = events[idx]?.["lng"] ?? null;

    // Clear existing coordinates so the geocoder re-runs for the new venue text
    const updatedEvent: Record<string, unknown> = { ...events[idx], venue: venue.trim() };
    delete updatedEvent["lat"];
    delete updatedEvent["lng"];

    // Geocode just this single event (synchronous so the response includes fresh coords)
    const geocoded = await geocodeEvents([updatedEvent]);
    const geocodedEvent = geocoded[0] ?? updatedEvent;

    // If geocoding returned null coords (e.g. Japanese venue names unresolvable by Nominatim),
    // restore the original coordinates so hardcoded map pins are not lost
    const finalEvent: Record<string, unknown> =
      (geocodedEvent["lat"] == null && geocodedEvent["lng"] == null && existingLat != null)
        ? { ...geocodedEvent, lat: existingLat, lng: existingLng }
        : geocodedEvent;

    const finalEvents = [
      ...events.slice(0, idx),
      finalEvent,
      ...events.slice(idx + 1),
    ];

    const [updated] = await db
      .update(digestsTable)
      .set({ events: finalEvents as any })
      .where(and(eq(digestsTable.id, id), eq(digestsTable.tenantId, req.tenant!.id)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Digest not found after update" });
      return;
    }

    req.log.info({ digestId: id, idx, venue: venue.trim(), geocoded: finalEvent["lat"] != null }, "Event venue patched and re-geocoded");
    res.json({ success: true, event: finalEvent, digest: digestToApi(updated) });
  } catch (err) {
    req.log.error({ err }, "Error updating event venue");
    res.status(500).json({ error: "server_error", message: "Failed to update venue" });
  }
});

// Debug: show raw emails + extracted events from Gmail inbox
router.get("/debug/emails", requireAdmin, async (req, res) => {
  try {
    const sinceStr = req.query.since as string | undefined;
    const since = sinceStr ? new Date(sinceStr) : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const emails = await debugFetchEmails(since);
    res.json({ emails });
  } catch (err) {
    req.log.error({ err }, "Error fetching debug emails");
    res.status(500).json({ error: "server_error", message: String(err) });
  }
});

// Create an empty digest for the upcoming week (no events). Used by admin spotlight flow.
router.post("/digest/create-empty", requireAdmin, async (req, res) => {
  const { weekOf: weekOfStr } = req.body as { weekOf?: string };
  try {
    const weekOf = weekOfStr ? new Date(weekOfStr) : getNextSunday();
    const dateLabel = weekOf.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const subject = `Events — Week of ${dateLabel}`;
    const intro = `Here's your curated digest for the week of ${dateLabel}.`;
    const [inserted] = await db
      .insert(digestsTable)
      .values({ tenantId: req.tenant!.id, weekOf, subject, intro, events: [] })
      .returning();
    res.json({ success: true, digest: digestToApi(inserted) });
  } catch (err) {
    req.log.error({ err }, "Error creating empty digest");
    res.status(500).json({ error: "server_error", message: "Failed to create digest" });
  }
});

// Generate a digest from user-supplied event source URLs (AI-powered scraping).
// Optional: pass digestId to merge extracted events into an existing digest instead of creating a new one.
router.post("/digest/generate-from-sources", requireAdmin, async (req, res) => {
  const { urls, weekOf: weekOfStr, digestId: targetDigestId } = req.body as { urls?: unknown; weekOf?: string; digestId?: number };

  if (!Array.isArray(urls) || urls.length === 0) {
    res.status(400).json({ error: "invalid_request", message: "urls[] array is required" });
    return;
  }

  const validUrls = (urls as unknown[]).filter((u): u is string => typeof u === "string" && u.startsWith("http")).slice(0, 5);
  if (validUrls.length === 0) {
    res.status(400).json({ error: "invalid_request", message: "No valid URLs provided" });
    return;
  }

  try {
    const weekOf = weekOfStr ? new Date(weekOfStr) : getNextSunday();
    const { events, results } = await extractEventsFromSources(validUrls, weekOf);

    const tenantCategories = (req.tenant!.categories as string[]) || [];
    const deduped = deduplicateEvents(events);
    const filtered = tenantCategories.length > 0 ? filterByTenantCategories(deduped, tenantCategories) : deduped;
    const finalEvents = applyTenantCategoryRestriction(
      req.tenant!.slug,
      filtered.length > 0 ? filtered : deduped,
    ).filter((e: EventItem) => !isAdultContent(e.title, e.description ?? ""));

    const sourceResults = results.map(r => ({ url: r.url, eventCount: r.events.length, error: r.error }));

    // No events found — return without creating/modifying a digest
    if (finalEvents.length === 0) {
      req.log.warn({ sources: validUrls.length }, "No events extracted from URL sources");
      res.json({ digest: null, eventsFound: 0, sourceResults });
      return;
    }

    let digest;

    if (typeof targetDigestId === "number") {
      // Merge mode: add new events into an existing digest (deduplicated)
      const [existing] = await db
        .select()
        .from(digestsTable)
        .where(and(eq(digestsTable.id, targetDigestId), eq(digestsTable.tenantId, req.tenant!.id)))
        .limit(1);

      if (!existing) {
        res.status(404).json({ error: "not_found", message: "Target digest not found" });
        return;
      }

      const merged = deduplicateEvents([...(existing.events as any[]), ...finalEvents]);
      const [updated] = await db
        .update(digestsTable)
        .set({ events: merged })
        .where(and(eq(digestsTable.id, targetDigestId), eq(digestsTable.tenantId, req.tenant!.id)))
        .returning();

      digest = updated;
      req.log.info({ digestId: targetDigestId, added: finalEvents.length, total: merged.length }, "Merged URL-sourced events into existing digest");
    } else {
      // Create mode: insert a new digest
      const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" };
      const weekEnd = new Date(weekOf.getTime() + 6 * 24 * 60 * 60 * 1000);
      const label = `${weekOf.toLocaleDateString("en-US", opts)}–${weekEnd.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
      const isAustinCares = req.tenant!.slug === "austincares";
      const subjectEmoji2 = isAustinCares ? "🏷️" : "🤠";
      const subject = `${subjectEmoji2} ${req.tenant!.digestTitle || `${req.tenant!.city} Events`}: ${label}`;
      const intro = isAustinCares
        ? `Happy Sunday, Austin! Here are this week's best local deals — from Tuesday lunch specials to all-week savings at your favorite spots.\n\nThese deals are hand-picked from Austin restaurants and local businesses. Tap any deal below to claim it.`
        : `Hey ${req.tenant!.city.split(",")[0]}! I combed through various event newsletters and hand-picked some cool events happening around the city. Here's your curated digest — get out there and enjoy it! 🤠`;

      const [newDigest] = await db
        .insert(digestsTable)
        .values({ tenantId: req.tenant!.id, weekOf, subject, intro, events: autoTagFutureEvents(finalEvents as EventItem[], weekOf), sentCount: 0 })
        .returning();

      digest = newDigest;
      req.log.info({ sources: validUrls.length, events: finalEvents.length }, "Generated new digest from URL sources");
    }

    // Geocode venue coordinates in the background (fire-and-forget)
    geocodeAndPatchDigest(digest.id, (digest.events as Array<Record<string, unknown>>)).catch(() => {});

    if (finalEvents.length > 0) {
      awardXP(req.tenant!.id, "digest_event", finalEvents.length * 5, { digestId: digest.id, eventCount: finalEvents.length }).catch(() => {});
    }

    const response = GenerateDigestResponse.parse({ digest: digestToApi(digest) });
    res.json({ ...response, eventsFound: finalEvents.length, sourceResults });
  } catch (err) {
    req.log.error({ err }, "Error generating digest from sources");
    res.status(500).json({ error: "server_error", message: "Failed to generate digest from sources" });
  }
});

// Admin endpoint: create a digest from a pre-built payload (bypasses Gmail parsing).
// Useful for pushing a manually-curated or dev-verified digest into production.
router.post("/digest/import", requireAdmin, async (req, res) => {
  const { weekOf: weekOfStr, subject, intro, events } = req.body || {};
  if (!weekOfStr || !subject || !intro || !Array.isArray(events) || events.length === 0) {
    res.status(400).json({ error: "invalid_request", message: "weekOf, subject, intro, and events[] are required" });
    return;
  }

  try {
    const weekOf = new Date(weekOfStr);
    if (isNaN(weekOf.getTime())) {
      res.status(400).json({ error: "invalid_request", message: "Invalid weekOf date" });
      return;
    }

    const taggedImportEvents = autoTagFutureEvents(
      applyTenantCategoryRestriction(req.tenant!.slug, events as EventItem[])
        .filter((e: EventItem) => !isAdultContent(e.title, e.description ?? "")),
      weekOf,
    );

    const [digest] = await db
      .insert(digestsTable)
      .values({ tenantId: req.tenant!.id, weekOf, subject, intro, events: taggedImportEvents, sentCount: 0 })
      .returning();

    const response = GenerateDigestResponse.parse({ digest: digestToApi(digest) });
    res.json(response);

    // Geocode venue coordinates in the background (fire-and-forget)
    geocodeAndPatchDigest(digest.id, taggedImportEvents as Array<Record<string, unknown>>).catch(() => {});

    // Pre-translate event titles + descriptions for Tokyo so first page
    // load is instant instead of waiting on OpenAI (fire-and-forget)
    if (req.tenant!.slug === "tokyo") {
      prewarmTranslationCache(taggedImportEvents as EventItem[]).catch(() => {});
    }
  } catch (err) {
    req.log.error({ err }, "Error importing digest");
    res.status(500).json({ error: "server_error", message: "Failed to import digest" });
  }
});

// ---------------------------------------------------------------------------
// Distance helpers for Austin radius personalization
// ---------------------------------------------------------------------------

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Split events into main (within radius) and alsoNearby (beyond radius) for
 * a subscriber who has saved an anchor location.
 *
 * - Spotlight / featured events always stay in main.
 * - Regular events with no coordinates are placed at the end of main.
 * - Regular events with coords beyond the radius go into alsoNearby.
 * - distanceMi (rounded to 1 decimal) is attached to every regular event.
 */
function personalizeEventsForSubscriber(
  events: any[],
  anchorLat: number,
  anchorLng: number,
  radiusMiles: number,
): { mainEvents: any[]; alsoNearby: any[] } {
  const passThrough = events.filter(
    (e) => e.featured || e.isBusinessSpotlight || e.isPost,
  );
  const regular = events.filter(
    (e) => !e.featured && !e.isBusinessSpotlight && !e.isPost,
  );

  const withDist = regular.map((e) => ({
    ...e,
    distanceMi:
      e.lat != null && e.lng != null
        ? Math.round(haversine(anchorLat, anchorLng, e.lat, e.lng) * 10) / 10
        : null,
  }));

  const within = withDist
    .filter((e) => e.distanceMi == null || e.distanceMi <= radiusMiles)
    .sort((a, b) => (a.distanceMi ?? Infinity) - (b.distanceMi ?? Infinity));

  const beyond = withDist
    .filter((e) => e.distanceMi != null && e.distanceMi > radiusMiles)
    .sort((a, b) => a.distanceMi - b.distanceMi);

  return { mainEvents: [...passThrough, ...within], alsoNearby: beyond };
}

router.get("/digest/:id/preview-email", requireAdmin, async (req, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid_request" }); return; }
  const [digest] = await db.select().from(digestsTable)
    .where(and(eq(digestsTable.id, id), eq(digestsTable.tenantId, req.tenant!.id))).limit(1);
  if (!digest) { res.status(404).json({ error: "not_found" }); return; }
  const tenant = req.tenant!;
  const siteUrl = `https://${tenant.slug}.eventcarpooling.com`;
  const html = buildDigestEmailHtml({
    events: (digest.events as any[]) || [],
    subject: digest.subject,
    intro: digest.intro || "",
    weekOf: digest.weekOf instanceof Date ? digest.weekOf.toISOString() : String(digest.weekOf),
    digestId: digest.id,
    siteUrl,
  }, undefined, undefined, tenant);
  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

router.post("/digest/send", requireAdmin, async (req, res) => {
  const parseResult = SendDigestBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "invalid_request", message: "Invalid request body" });
    return;
  }

  const { digestId, testEmail, confirm } = parseResult.data;

  // Safety guard: a full subscriber send requires explicit opt-in.
  // Without testEmail OR confirm:true, reject the request immediately so that
  // a mis-typed field name (e.g. previewOnly instead of testEmail) can never
  // accidentally trigger a live blast.
  if (!testEmail && confirm !== true) {
    res.status(400).json({
      error: "confirmation_required",
      message: "Sending to all subscribers requires confirm: true in the request body.",
    });
    return;
  }

  try {
    const [digest] = await db
      .select()
      .from(digestsTable)
      .where(and(eq(digestsTable.id, digestId), eq(digestsTable.tenantId, req.tenant!.id)))
      .limit(1);

    if (!digest) {
      res.status(404).json({ error: "not_found", message: "Digest not found" });
      return;
    }

    type RecipientWithLocation = {
      email: string;
      name: string | null;
      anchorLat: number | null;
      anchorLng: number | null;
      radiusMiles: number;
      walkableOnly: boolean;
    };
    let recipients: RecipientWithLocation[] = [];
    // Always use the tenant's canonical subdomain for RSVP/unsubscribe links in emails.
    // This is the only reliable approach — header-based inference can return the platform
    // root domain (eventcarpooling.com) which has no tenant and breaks the carpool flow.
    const siteUrl = process.env.SITE_URL || `https://${req.tenant!.slug}.eventcarpooling.com`;

    if (testEmail) {
      recipients = [{ email: testEmail, name: null, anchorLat: null, anchorLng: null, radiusMiles: 3, walkableOnly: false }];
    } else {
      const subscribers = await db
        .select()
        .from(subscribersTable)
        .where(and(eq(subscribersTable.isActive, true), eq(subscribersTable.tenantId, req.tenant!.id)));
      recipients = subscribers.map(s => ({
        email: s.email,
        name: s.name,
        anchorLat: s.anchorLat ?? null,
        anchorLng: s.anchorLng ?? null,
        radiusMiles: s.radiusMiles ?? 3,
        walkableOnly: s.walkableOnly ?? false,
      }));
    }

    if (recipients.length === 0) {
      const response = SendDigestResponse.parse({
        success: false,
        message: "No subscribers to send to",
      });
      res.json(response);
      return;
    }

    let successCount = 0;
    let failCount = 0;

    // Only include upcoming events in the email (filter out past events)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const MONTH_IDX: Record<string, number> = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
    function isUpcomingEvent(dateStr: string): boolean {
      const m = (dateStr || "").match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})/i);
      if (!m) return true;
      const key = m[1].substring(0,3);
      const mo = MONTH_IDX[key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()];
      if (mo === undefined) return true;
      return new Date(today.getFullYear(), mo, parseInt(m[2], 10)) >= today;
    }
    const emailEvents = ((digest.events as any[]) || []).filter(e => isUpcomingEvent(e.date));

    const isAustin = req.tenant?.slug === "austin";

    for (const recipient of recipients) {
      let recipientEvents: any[] = emailEvents;
      let alsoNearby: any[] = [];

      if (isAustin && recipient.anchorLat != null && recipient.anchorLng != null) {
        const effectiveRadius = recipient.walkableOnly ? 1 : recipient.radiusMiles;
        const personalized = personalizeEventsForSubscriber(
          emailEvents,
          recipient.anchorLat,
          recipient.anchorLng,
          effectiveRadius,
        );
        recipientEvents = personalized.mainEvents;
        alsoNearby = personalized.alsoNearby;
      }

      const prefToken = isAustin ? signSubscriberToken(recipient.email) : null;
      const preferencesUrl = prefToken
        ? `${siteUrl}/preferences?email=${encodeURIComponent(recipient.email)}&token=${prefToken}`
        : null;

      // For Tokyo: translate event titles + descriptions to Japanese before emailing
      const eventsForEmail = req.tenant?.slug === "tokyo"
        ? await translateEventsForEmail(recipientEvents)
        : recipientEvents;

      const html = buildDigestEmailHtml({
        subject: digest.subject,
        intro: digest.intro,
        weekOf: digest.weekOf,
        events: eventsForEmail,
        digestId: digest.id,
        siteUrl,
        preferencesUrl,
        alsoNearby,
      }, recipient.name, recipient.email, req.tenant ?? undefined);

      const result = await sendEmail({
        to: recipient.email,
        subject: digest.subject,
        html,
        fromName: req.tenant?.name || undefined,
        replyTo: req.tenant?.adminEmail || undefined,
      });

      if (result.success) {
        successCount++;
      } else {
        failCount++;
        req.log.warn({ email: recipient.email, error: result.error }, "Failed to send to subscriber");
      }
    }

    if (!testEmail) {
      await db
        .update(digestsTable)
        .set({ sentAt: new Date(), sentCount: successCount })
        .where(and(eq(digestsTable.id, digestId), eq(digestsTable.tenantId, req.tenant!.id)));
    }

    const response = SendDigestResponse.parse({
      success: true,
      message: testEmail
        ? `Test email sent to ${testEmail}`
        : `Newsletter sent! ${successCount} delivered, ${failCount} failed out of ${recipients.length} subscribers.`,
    });
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Error sending digest");
    res.status(500).json({ error: "server_error", message: "Failed to send digest" });
  }
});

// ---------------------------------------------------------------------------
// Tell a Friend — SMS share (POST /api/events/share)
// ---------------------------------------------------------------------------
router.post("/share", async (req, res) => {
  const { phone, eventTitle, eventDate, eventVenue, eventDescription, eventLink, shareUrl } = req.body || {};

  if (!phone || typeof phone !== "string" || !eventTitle || typeof eventTitle !== "string") {
    res.status(400).json({ success: false, message: "Phone and event title are required." });
    return;
  }

  // Normalise to E.164 US format
  const digits = phone.replace(/\D/g, "");
  let toPhone: string;
  if (digits.length === 10) {
    toPhone = `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith("1")) {
    toPhone = `+${digits}`;
  } else {
    res.status(400).json({ success: false, message: "Please enter a valid US phone number." });
    return;
  }

  const twilioSid  = process.env["TWILIO_ACCOUNT_SID"];
  const twilioAuth = process.env["TWILIO_AUTH_TOKEN"];
  const twilioFrom = process.env["TWILIO_PHONE_NUMBER"];

  if (!twilioSid || !twilioAuth || !twilioFrom) {
    req.log.warn("Twilio env vars not set — SMS share unavailable");
    res.status(503).json({ success: false, message: "SMS not available yet — check back soon!" });
    return;
  }

  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(twilioSid, twilioAuth);

    const descSnippet =
      typeof eventDescription === "string" && eventDescription
        ? eventDescription.length > 120
          ? eventDescription.slice(0, 120) + "…"
          : eventDescription
        : "";

    const msgParts: string[] = [`📅 ${eventTitle}`];
    if (eventDate)   msgParts.push(`🗓 ${eventDate}`);
    if (eventVenue)  msgParts.push(`📍 ${eventVenue}`);
    if (descSnippet) msgParts.push(`\n${descSnippet}`);
    if (shareUrl)    msgParts.push(`\n🔗 ${shareUrl}`);
    if (eventLink && eventLink !== shareUrl) msgParts.push(`Tickets/details: ${eventLink}`);

    await client.messages.create({ body: msgParts.join("\n"), from: twilioFrom, to: toPhone });
    res.json({ success: true });
  } catch (err: unknown) {
    req.log.error({ err }, "Twilio SMS share error");
    // Surface Twilio's own error message so the caller can diagnose account issues
    const twilioMsg = (err as { message?: string })?.message;
    const userMsg = twilioMsg && twilioMsg.length < 200
      ? twilioMsg
      : "Failed to send text. Please try again.";
    res.status(500).json({ success: false, message: userMsg });
  }
});

export default router;
