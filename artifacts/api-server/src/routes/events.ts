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
      .orderBy(desc(digestsTable.createdAt))
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
      .orderBy(desc(digestsTable.createdAt));

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

  try {
    const weekOf = weekOfStr ? new Date(weekOfStr) : getNextSunday();
    const generated = generateSampleDigest(weekOf, customNotes || undefined);

    const [digest] = await db
      .insert(digestsTable)
      .values({
        weekOf,
        subject: generated.subject,
        intro: generated.intro,
        events: generated.events,
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

    let recipients: string[] = [];

    if (testEmail) {
      recipients = [testEmail];
    } else {
      const subscribers = await db
        .select()
        .from(subscribersTable)
        .where(eq(subscribersTable.isActive, true));
      recipients = subscribers.map(s => s.email);
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

    for (const email of recipients) {
      const html = buildDigestEmailHtml({
        subject: digest.subject,
        intro: digest.intro,
        weekOf: digest.weekOf,
        events: (digest.events as any[]) || [],
      });

      const result = await sendEmail({
        to: email,
        subject: digest.subject,
        html,
      });

      if (result.success) {
        successCount++;
      } else {
        failCount++;
        req.log.warn({ email, error: result.error }, "Failed to send to subscriber");
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
