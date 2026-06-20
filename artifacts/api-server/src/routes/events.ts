import { Router, type IRouter } from "express";
import { db, digestsTable, subscribersTable } from "@workspace/db";
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
import { requireAdmin } from "../middleware/requireAdmin";

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
    let events: any[];
    let sourceNote = "";

    if (isEmailReaderConfigured()) {
      req.log.info("Gmail configured — fetching events from inbox");
      // Look back 14 days before the target range start to catch newsletters sent in advance
      const since = new Date(weekOf);
      since.setDate(since.getDate() - 14);
      // Only apply a 'before' cap for past ranges so current/future ranges get all recent mail
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const rangeEnd = weekEnd || new Date(weekOf.getTime() + 7 * 24 * 60 * 60 * 1000);
      const isPastRange = rangeEnd < twoWeeksAgo;
      const before = isPastRange ? rangeEnd : undefined;

      const gmailResult = await fetchEventsFromGmail(since, before, weekOf, weekEnd);
      sourceNote = `(sourced from ${gmailResult.emails} newsletter email${gmailResult.emails === 1 ? "" : "s"}${gmailResult.weekFiltered ? ", date-filtered" : ""})`;

      const fallback = generateSampleDigest(weekOf, customNotes || undefined);
      // Use custom date-range subject when weekEnd is provided
      if (weekEnd) {
        const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" };
        const inclusiveEnd = new Date(weekEnd.getTime() - 86400000);
        const label = `${weekOf.toLocaleDateString("en-US", opts)}–${inclusiveEnd.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
        subject = `🤠 Austin Events: ${label}`;
      } else {
        subject = fallback.subject;
      }

      // Use Gmail events only when they are week-filtered (matched the target week).
      // If weekOf was requested but no week-matching events were found, fall back to
      // sample events with correct dates for that week instead of showing stale old events.
      const useGmailEvents = gmailResult.weekFiltered && gmailResult.events.length > 0;
      if (useGmailEvents) {
        events = gmailResult.events;
        intro = customNotes ? `${gmailResult.intro}\n\n${customNotes}` : gmailResult.intro;
      } else {
        events = fallback.events;
        intro = customNotes ? `${fallback.intro}\n\n${customNotes}` : fallback.intro;
        req.log.info(
          { weekOf: weekOf.toISOString().substring(0, 10), gmailEvents: gmailResult.events.length },
          "No week-specific events found in Gmail newsletters — using sample data for target week"
        );
      }

      req.log.info({ emailsFetched: gmailResult.emails, eventsFound: events.length, weekFiltered: gmailResult.weekFiltered }, sourceNote);
    } else {
      req.log.info("Gmail not configured — using sample digest data");
      const generated = generateSampleDigest(weekOf, customNotes || undefined);
      subject = generated.subject;
      intro = generated.intro;
      events = generated.events;
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
    // Build the public-facing site URL for RSVP links in emails.
    // Priority: explicit SITE_URL → REPLIT_DOMAINS (production) → x-forwarded-host → fallback
    const replitDomain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
    const forwardedHost = req.get("x-forwarded-host");
    const siteUrl = process.env.SITE_URL
      || (replitDomain ? `https://${replitDomain}` : null)
      || (forwardedHost ? `https://${forwardedHost}` : null)
      || `https://${req.get("host")}`;

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
