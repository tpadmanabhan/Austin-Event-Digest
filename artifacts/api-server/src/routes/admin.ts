import { Router, type IRouter } from "express";
import { db, rsvpsTable, digestsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { sendRsvpGroupNotification } from "../lib/emailService";
import { verifyTurnstileToken } from "../lib/turnstile";
import { requireAdmin, adminTokenForHash } from "../middleware/requireAdmin";
import { verifyPassword } from "../lib/passwordHash";

const router: IRouter = Router();

router.post("/login", async (req, res) => {
  if (!req.tenant) {
    res.status(404).json({ error: "not_found", message: "Admin login requires a city subdomain" });
    return;
  }

  if (!req.tenant.passwordHash) {
    res.status(503).json({
      error: "not_configured",
      message:
        "Admin password not configured for this city. Set ADMIN_PASSWORD and restart the server to complete setup.",
    });
    return;
  }

  const captchaOk = await verifyTurnstileToken(req.body?.captchaToken, req.ip);
  if (!captchaOk) {
    res.status(400).json({ error: "captcha_failed", message: "CAPTCHA verification failed. Please try again." });
    return;
  }

  const { password } = req.body ?? {};
  if (!password || typeof password !== "string") {
    res.status(400).json({ error: "invalid_request", message: "password is required" });
    return;
  }

  const valid = await verifyPassword(password, req.tenant.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "unauthorized", message: "Incorrect password" });
    return;
  }

  const token = adminTokenForHash(req.tenant.passwordHash);
  res.json({ token });
});

router.post("/verify", (req, res) => {
  const { token } = req.body ?? {};

  if (!req.tenant?.passwordHash) {
    res.status(401).json({ valid: false });
    return;
  }

  if (!token || typeof token !== "string") {
    res.status(401).json({ valid: false });
    return;
  }

  const expected = adminTokenForHash(req.tenant.passwordHash);
  res.json({ valid: token === expected });
});

// Re-send carpool match notifications for all RSVPs on an event
router.post("/rsvp/resend", requireAdmin, async (req, res) => {
  const { digestId, eventTitle } = req.body ?? {};

  if (!digestId || typeof digestId !== "number" || !eventTitle) {
    res.status(400).json({ error: "invalid_request", message: "digestId (number) and eventTitle are required" });
    return;
  }

  const tenantId = req.tenant!.id;

  try {
    const [digest] = await db
      .select()
      .from(digestsTable)
      .where(and(eq(digestsTable.id, digestId), eq(digestsTable.tenantId, tenantId)))
      .limit(1);
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
        eq(rsvpsTable.tenantId, tenantId),
        eq(rsvpsTable.digestId, digestId),
        eq(rsvpsTable.eventTitle, eventTitle),
      ));

    if (rsvps.length < 2) {
      res.json({ sent: 0, message: "Fewer than 2 RSVPs — nothing to notify", rsvpCount: rsvps.length });
      return;
    }

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

// One-time fix: null out 6amcity individual event slug links (they browser-404)
router.post("/fix-broken-links", requireAdmin, async (req, res) => {
  const tenantId = req.tenant!.id;
  try {
    const digests = await db
      .select()
      .from(digestsTable)
      .where(eq(digestsTable.tenantId, tenantId));
    let totalFixed = 0;
    for (const digest of digests) {
      const events = (digest.events as any[]) || [];
      let changed = false;
      const fixed = events.map((e: any) => {
        if (e.link && /6amcity\.com\/[a-z]{2}\/[a-z-]+\/events\//i.test(e.link)) {
          changed = true;
          totalFixed++;
          return { ...e, link: null };
        }
        return e;
      });
      if (changed) {
        await db
          .update(digestsTable)
          .set({ events: fixed })
          .where(and(eq(digestsTable.id, digest.id), eq(digestsTable.tenantId, tenantId)));
      }
    }
    res.json({ success: true, totalFixed });
  } catch (err) {
    req.log.error({ err }, "Error fixing broken links");
    res.status(500).json({ error: "server_error" });
  }
});

// Patch a digest subject
router.post("/digest/patch-subject", requireAdmin, async (req, res) => {
  const { digestId, subject } = req.body ?? {};
  if (!digestId || typeof digestId !== "number" || !subject) {
    res.status(400).json({ error: "invalid_request", message: "digestId and subject are required" });
    return;
  }
  const tenantId = req.tenant!.id;
  try {
    await db
      .update(digestsTable)
      .set({ subject })
      .where(and(eq(digestsTable.id, digestId), eq(digestsTable.tenantId, tenantId)));
    res.json({ success: true, digestId, subject });
  } catch (err) {
    req.log.error({ err }, "Error patching digest subject");
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
