import { Router, type IRouter } from "express";
import { db, digestsTable, subscribersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
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

router.post("/digest/generate", async (req, res) => {
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

router.delete("/digest/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_request", message: "Invalid digest id" });
    return;
  }

  try {
    const deleted = await db
      .delete(digestsTable)
      .where(eq(digestsTable.id, id))
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
router.get("/debug/emails", async (req, res) => {
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
router.post("/digest/import", async (req, res) => {
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
      .values({ weekOf, subject, intro, events, sentCount: 0 })
      .returning();

    const response = GenerateDigestResponse.parse({ digest: digestToApi(digest) });
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Error importing digest");
    res.status(500).json({ error: "server_error", message: "Failed to import digest" });
  }
});

router.post("/digest/send", async (req, res) => {
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
      .where(eq(digestsTable.id, digestId))
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
        .where(eq(subscribersTable.isActive, true));
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

    for (const recipient of recipients) {
      const html = buildDigestEmailHtml({
        subject: digest.subject,
        intro: digest.intro,
        weekOf: digest.weekOf,
        events: (digest.events as any[]) || [],
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
        .where(eq(digestsTable.id, digestId));
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
