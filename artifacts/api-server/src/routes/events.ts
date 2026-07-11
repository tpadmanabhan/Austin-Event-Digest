import { Router, type IRouter } from "express";
import { db, digestsTable, subscribersTable, type EventItem } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import {
  GenerateDigestBody,
  SendDigestBody,
  GetLatestDigestResponse,
  ListDigestsResponse,
  GenerateDigestResponse,
  SendDigestResponse,
} from "@workspace/api-zod";
import { generateSampleDigest, getNextSunday } from "../lib/digestGenerator";
import { sendEmail, buildDigestEmailHtml } from "../lib/emailService";
import { fetchEventsFromGmail, isEmailReaderConfigured, debugFetchEmails } from "../lib/emailReader";
import { fetchEventsForTenant, deduplicateEvents, filterByTenantCategories } from "../lib/eventSources";
import { requireAdmin } from "../middleware/requireAdmin";
import { awardXP } from "../lib/gamification";
import { extractEventsFromSources } from "../lib/urlEventExtractor";

const router: IRouter = Router();

function digestToApi(d: typeof digestsTable.$inferSelect) {
  return {
    id: d.id,
    weekOf: d.weekOf,
    subject: d.subject,
    intro: d.intro,
    events: (d.events as any[]) || [],
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

    const fallback = generateSampleDigest(weekOf, customNotes || undefined);

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
          combinedEvents = [...combinedEvents, ...gmailResult.events];
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
      subject = `🤠 ${req.tenant!.digestTitle || `${req.tenant!.city} Events`}: ${label}`;
    } else {
      subject = fallback.subject;
    }

    if (mergedEvents.length > 0) {
      events = mergedEvents;
      const introBase = gmailIntro || fallback.intro;
      intro = customNotes ? `${introBase}\n\n${customNotes}` : introBase;
      req.log.info(
        { adapterEvents: adapterResult.events.length, sources: adapterResult.sources, total: mergedEvents.length, filtered: deduped.length - mergedEvents.length },
        "Digest populated from discovered events"
      );
    } else {
      events = fallback.events;
      intro = customNotes ? `${fallback.intro}\n\n${customNotes}` : fallback.intro;
      req.log.info(
        { weekOf: weekOf.toISOString().substring(0, 10) },
        "No events discovered from any source — using sample digest data"
      );
    }

    const [digest] = await db
      .insert(digestsTable)
      .values({
        tenantId: req.tenant!.id,
        weekOf,
        subject,
        intro,
        events,
        sentCount: 0,
      })
      .returning();

    const response = GenerateDigestResponse.parse({ digest: digestToApi(digest) });
    res.json(response);

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
  try {
    const [updated] = await db
      .update(digestsTable)
      .set({ events })
      .where(and(eq(digestsTable.id, id), eq(digestsTable.tenantId, req.tenant!.id)))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Digest not found" });
      return;
    }
    res.json({ success: true, digest: digestToApi(updated) });
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
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
      },
    });
    if (!res.ok) return { title: "", description: "", imageUrl: null };
    const html = await res.text();
    const og = (prop: string) => {
      const m = html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, "i"))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, "i"));
      return m ? m[1].trim() : "";
    };
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return {
      title: og("title") || (titleTag ? titleTag[1].trim() : ""),
      description: og("description"),
      imageUrl: og("image") || null,
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
  const { url, type, title: titleOverride, description: descOverride, deadline } = req.body || {};
  if (typeof url !== "string" || !url.startsWith("http")) {
    res.status(400).json({ error: "invalid_request", message: "url is required and must start with http" });
    return;
  }
  if (type !== "business" && type !== "community") {
    res.status(400).json({ error: "invalid_request", message: "type must be 'business' or 'community'" });
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

    const spotlight: EventItem = {
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
    const updatedEvents = [...currentEvents, spotlight];

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
    const finalEvents = filtered.length > 0 ? filtered : deduped;

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
      const subject = `🤠 ${req.tenant!.digestTitle || `${req.tenant!.city} Events`}: ${label}`;
      const intro = `Hey ${req.tenant!.city.split(",")[0]}! With the help of AI, I combed through various event newsletters and hand-picked some cool events happening around the city. Here's your curated digest — get out there and enjoy it! 🤠`;

      const [newDigest] = await db
        .insert(digestsTable)
        .values({ tenantId: req.tenant!.id, weekOf, subject, intro, events: finalEvents, sentCount: 0 })
        .returning();

      digest = newDigest;
      req.log.info({ sources: validUrls.length, events: finalEvents.length }, "Generated new digest from URL sources");
    }

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

    const [digest] = await db
      .insert(digestsTable)
      .values({ tenantId: req.tenant!.id, weekOf, subject, intro, events, sentCount: 0 })
      .returning();

    const response = GenerateDigestResponse.parse({ digest: digestToApi(digest) });
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Error importing digest");
    res.status(500).json({ error: "server_error", message: "Failed to import digest" });
  }
});

router.post("/digest/send", requireAdmin, async (req, res) => {
  const parseResult = SendDigestBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "invalid_request", message: "Invalid request body" });
    return;
  }

  const { digestId, testEmail } = parseResult.data;

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

    let recipients: Array<{ email: string; name: string | null }> = [];
    // Always use the tenant's canonical subdomain for RSVP/unsubscribe links in emails.
    // This is the only reliable approach — header-based inference can return the platform
    // root domain (eventcarpooling.com) which has no tenant and breaks the carpool flow.
    const siteUrl = process.env.SITE_URL || `https://${req.tenant!.slug}.eventcarpooling.com`;

    if (testEmail) {
      recipients = [{ email: testEmail, name: null }];
    } else {
      const subscribers = await db
        .select()
        .from(subscribersTable)
        .where(and(eq(subscribersTable.isActive, true), eq(subscribersTable.tenantId, req.tenant!.id)));
      recipients = subscribers.map(s => ({ email: s.email, name: s.name }));
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

    for (const recipient of recipients) {
      const html = buildDigestEmailHtml({
        subject: digest.subject,
        intro: digest.intro,
        weekOf: digest.weekOf,
        events: emailEvents,
        digestId: digest.id,
        siteUrl,
      }, recipient.name, recipient.email);

      const result = await sendEmail({
        to: recipient.email,
        subject: digest.subject,
        html,
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

export default router;
