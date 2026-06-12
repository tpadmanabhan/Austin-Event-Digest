import { Router, type IRouter } from "express";
import { createHmac } from "crypto";
import { db, rsvpsTable, digestsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { sendRsvpNotification, sendRsvpGroupNotification } from "../lib/emailService";
import { verifyTurnstileToken } from "../lib/turnstile";

const router: IRouter = Router();

function verifyAdminToken(token: string | undefined): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || !token) return false;
  const expected = createHmac("sha256", adminPassword).update("admin-session").digest("hex");
  return token === expected;
}

router.post("/login", async (req, res) => {
  const captchaOk = await verifyTurnstileToken(req.body?.captchaToken, req.ip);
  if (!captchaOk) {
    res.status(400).json({ error: "captcha_failed", message: "CAPTCHA verification failed. Please try again." });
    return;
  }

  const { password } = req.body ?? {};
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    res.status(503).json({ error: "not_configured", message: "Admin password not configured" });
    return;
  }

  if (!password || password !== adminPassword) {
    res.status(401).json({ error: "unauthorized", message: "Incorrect password" });
    return;
  }

  const token = createHmac("sha256", adminPassword)
    .update("admin-session")
    .digest("hex");

  res.json({ token });
});

router.post("/verify", (req, res) => {
  const { token } = req.body ?? {};
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || !token) {
    res.status(401).json({ valid: false });
    return;
  }

  const expected = createHmac("sha256", adminPassword)
    .update("admin-session")
    .digest("hex");

  res.json({ valid: token === expected });
});

// Re-send carpool match notifications for all RSVPs on an event
router.post("/rsvp/resend", async (req, res) => {
  const { token, digestId, eventTitle } = req.body ?? {};

  if (!verifyAdminToken(token)) {
    res.status(401).json({ error: "unauthorized", message: "Invalid admin token" });
    return;
  }

  if (!digestId || typeof digestId !== "number" || !eventTitle) {
    res.status(400).json({ error: "invalid_request", message: "digestId (number) and eventTitle are required" });
    return;
  }

  try {
    const [digest] = await db.select().from(digestsTable).where(eq(digestsTable.id, digestId)).limit(1);
    if (!digest) {
      res.status(404).json({ error: "not_found", message: "Digest not found" });
      return;
    }

    const events = (digest.events as any[]) || [];
    const event = events.find((e: any) => e.title === eventTitle)
      ?? events.find((e: any) =>
        e.title.toLowerCase().includes(eventTitle.toLowerCase()) ||
        eventTitle.toLowerCase().includes(e.title.toLowerCase())
      );
    if (!event) {
      res.status(404).json({ error: "not_found", message: "Event not found in digest" });
      return;
    }

    const rsvps = await db
      .select()
      .from(rsvpsTable)
      .where(and(
        eq(rsvpsTable.digestId, digestId),
        eq(rsvpsTable.eventTitle, eventTitle),
      ));

    if (rsvps.length < 2) {
      res.json({ sent: 0, message: "Fewer than 2 RSVPs — nothing to notify", rsvpCount: rsvps.length });
      return;
    }

    // Send each person ONE consolidated email listing all the other RSVPers
    const results: { to: string; success: boolean; matchCount: number; error?: string }[] = [];
    for (const recipient of rsvps) {
      const others = rsvps
        .filter(r => r.email !== recipient.email)
        .map(r => ({ name: r.name || r.email.split("@")[0], email: r.email }));
      try {
        await sendRsvpGroupNotification({
          to: recipient.email,
          matches: others,
          eventTitle: event.title,
          eventDate: event.date,
          eventVenue: event.venue,
        });
        results.push({ to: recipient.email, success: true, matchCount: others.length });
      } catch (err: any) {
        results.push({ to: recipient.email, success: false, matchCount: others.length, error: err?.message });
      }
    }

    const sent = results.filter(r => r.success).length;
    req.log.info({ digestId, eventTitle, sent, total: results.length }, "Carpool notifications resent");
    res.json({ sent, total: results.length, results });
  } catch (err) {
    req.log.error({ err }, "Error resending RSVP notifications");
    res.status(500).json({ error: "server_error", message: "Failed to resend notifications" });
  }
});

export default router;
