import { Router, type IRouter } from "express";
import { db, subscribersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  SubscribeToNewsletterBody,
  UnsubscribeFromNewsletterBody,
  SubscribeToNewsletterResponse,
  UnsubscribeFromNewsletterResponse,
  GetSubscribersResponse,
} from "@workspace/api-zod";
import { sendWelcomeEmail, sendNewSubscriberAdminNotification, sendFeatureInterestEmails } from "../lib/emailService";
import { verifyTurnstileToken } from "../lib/turnstile";
import { requireAdmin } from "../middleware/requireAdmin";
import { awardXP } from "../lib/gamification";
import { geocodeVenue } from "../lib/geocodeVenue";
import { verifySubscriberToken } from "../lib/subscriberToken";

const router: IRouter = Router();

router.post("/subscribe", async (req, res) => {
  const captchaOk = await verifyTurnstileToken(req.body?.captchaToken, req.ip);
  if (!captchaOk) {
    res.status(400).json({ error: "captcha_failed", message: "CAPTCHA verification failed. Please try again." });
    return;
  }

  const parseResult = SubscribeToNewsletterBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "invalid_request", message: "Invalid email address" });
    return;
  }

  const { email, birthMonth, birthDay } = parseResult.data;
  const tenantId = req.tenant!.id;

  try {
    const existing = await db
      .select()
      .from(subscribersTable)
      .where(and(eq(subscribersTable.email, email), eq(subscribersTable.tenantId, tenantId)))
      .limit(1);

    if (existing.length > 0) {
      const sub = existing[0];
      if (!sub.isActive) {
        await db
          .update(subscribersTable)
          .set({ isActive: true, birthMonth: birthMonth ?? sub.birthMonth, birthDay: birthDay ?? sub.birthDay })
          .where(and(eq(subscribersTable.email, email), eq(subscribersTable.tenantId, tenantId)));

        const updated = await db
          .select()
          .from(subscribersTable)
          .where(and(eq(subscribersTable.email, email), eq(subscribersTable.tenantId, tenantId)))
          .limit(1);

        const response = SubscribeToNewsletterResponse.parse({
          success: true,
          message: "Welcome back! You've been re-subscribed.",
          subscriber: {
            id: updated[0].id,
            email: updated[0].email,
            name: updated[0].name,
            birthMonth: updated[0].birthMonth,
            birthDay: updated[0].birthDay,
            subscribedAt: updated[0].subscribedAt,
            isActive: updated[0].isActive,
          },
        });
        res.json(response);
        sendWelcomeEmail(email, updated[0].name, req.tenant).catch(() => {});
        sendNewSubscriberAdminNotification({ subscriberEmail: email, subscriberName: updated[0].name, isResubscribe: true, adminEmail: req.tenant!.adminEmail }).catch(() => {});
        return;
      }

      const response = SubscribeToNewsletterResponse.parse({
        success: true,
        message: "You're already subscribed!",
        subscriber: {
          id: sub.id,
          email: sub.email,
          name: sub.name,
          birthMonth: sub.birthMonth,
          birthDay: sub.birthDay,
          subscribedAt: sub.subscribedAt,
          isActive: sub.isActive,
        },
      });
      res.json(response);
      return;
    }

    const [newSub] = await db
      .insert(subscribersTable)
      .values({ tenantId, email, birthMonth: birthMonth || null, birthDay: birthDay || null, isActive: true })
      .returning();

    const response = SubscribeToNewsletterResponse.parse({
      success: true,
      message: `You're subscribed! You'll receive ${req.tenant?.digestTitle || req.tenant?.name || "the"} digest every Sunday.`,
      subscriber: {
        id: newSub.id,
        email: newSub.email,
        name: newSub.name,
        birthMonth: newSub.birthMonth,
        birthDay: newSub.birthDay,
        subscribedAt: newSub.subscribedAt,
        isActive: newSub.isActive,
      },
    });
    res.json(response);
    sendWelcomeEmail(email, null, req.tenant).catch(() => {});
    sendNewSubscriberAdminNotification({ subscriberEmail: email, subscriberName: null, adminEmail: req.tenant!.adminEmail }).catch(() => {});
    awardXP(tenantId, "subscriber", 3, { email }).catch(() => {});
  } catch (err) {
    req.log.error({ err }, "Error subscribing");
    res.status(500).json({ error: "server_error", message: "Failed to subscribe" });
  }
});

router.post("/unsubscribe", async (req, res) => {
  const parseResult = UnsubscribeFromNewsletterBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "invalid_request", message: "Invalid email" });
    return;
  }

  const { email } = parseResult.data;
  const tenantId = req.tenant!.id;

  try {
    await db
      .update(subscribersTable)
      .set({ isActive: false })
      .where(and(eq(subscribersTable.email, email), eq(subscribersTable.tenantId, tenantId)));

    const response = UnsubscribeFromNewsletterResponse.parse({
      success: true,
      message: "You've been unsubscribed. Sorry to see you go!",
    });
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Error unsubscribing");
    res.status(500).json({ error: "server_error", message: "Failed to unsubscribe" });
  }
});

router.get("/subscribers", requireAdmin, async (req, res) => {
  try {
    const subscribers = await db
      .select()
      .from(subscribersTable)
      .where(eq(subscribersTable.tenantId, req.tenant!.id))
      .orderBy(subscribersTable.subscribedAt);

    const response = GetSubscribersResponse.parse({
      subscribers: subscribers.map(s => ({
        id: s.id,
        email: s.email,
        name: s.name,
        subscribedAt: s.subscribedAt,
        isActive: s.isActive,
      })),
      total: subscribers.filter(s => s.isActive).length,
    });
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Error fetching subscribers");
    res.status(500).json({ error: "server_error", message: "Failed to fetch subscribers" });
  }
});

router.post("/subscribers/import", requireAdmin, async (req, res) => {
  const { subscribers: list } = req.body || {};
  if (!Array.isArray(list) || list.length === 0) {
    res.status(400).json({ error: "invalid_request", message: "subscribers[] is required" });
    return;
  }
  const tenantId = req.tenant!.id;
  let imported = 0;
  let skipped = 0;
  try {
    for (const entry of list) {
      const email = typeof entry.email === "string" ? entry.email.trim().toLowerCase() : null;
      if (!email) { skipped++; continue; }
      const name = typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : null;
      const [existing] = await db.select().from(subscribersTable)
        .where(and(eq(subscribersTable.email, email), eq(subscribersTable.tenantId, tenantId)));
      if (existing) { skipped++; continue; }
      await db.insert(subscribersTable).values({ tenantId, email, name, isActive: true });
      imported++;
    }
    res.json({ success: true, imported, skipped });
  } catch (err) {
    req.log.error({ err }, "Error importing subscribers");
    res.status(500).json({ error: "server_error", message: "Failed to import subscribers" });
  }
});

router.post("/feature-interest", async (req, res) => {
  const { email } = req.body ?? {};
  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "invalid_request", message: "A valid email address is required" });
    return;
  }
  sendFeatureInterestEmails(email.toLowerCase().trim()).catch((err) => {
    req.log.warn({ err, email }, "Feature interest email fire-and-forget error");
  });
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Subscriber location preferences (Austin only, token-authenticated)
// ---------------------------------------------------------------------------

router.get("/preferences", async (req, res) => {
  const email = ((req.query.email as string) || "").toLowerCase().trim();
  const token = (req.query.token as string) || "";

  if (!email || !verifySubscriberToken(email, token)) {
    res.status(401).json({ error: "unauthorized", message: "Invalid or expired link" });
    return;
  }

  try {
    const [sub] = await db
      .select()
      .from(subscribersTable)
      .where(and(eq(subscribersTable.email, email), eq(subscribersTable.tenantId, req.tenant!.id)))
      .limit(1);

    if (!sub || !sub.isActive) {
      res.status(404).json({ error: "not_found", message: "Subscriber not found" });
      return;
    }

    res.json({
      success: true,
      preferences: {
        anchorLat: sub.anchorLat ?? null,
        anchorLng: sub.anchorLng ?? null,
        radiusMiles: sub.radiusMiles ?? 3,
        walkableOnly: sub.walkableOnly ?? false,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching preferences");
    res.status(500).json({ error: "server_error", message: "Failed to fetch preferences" });
  }
});

router.post("/preferences", async (req, res) => {
  const { email: rawEmail, token, address, radiusMiles: rawRadius, walkableOnly: rawWalkable } = req.body || {};

  const email = (rawEmail || "").toLowerCase().trim();
  if (!email || !verifySubscriberToken(email, token || "")) {
    res.status(401).json({ error: "unauthorized", message: "Invalid or expired link" });
    return;
  }

  try {
    const [sub] = await db
      .select()
      .from(subscribersTable)
      .where(and(eq(subscribersTable.email, email), eq(subscribersTable.tenantId, req.tenant!.id)))
      .limit(1);

    if (!sub || !sub.isActive) {
      res.status(404).json({ error: "not_found", message: "Subscriber not found" });
      return;
    }

    let anchorLat: number | null = sub.anchorLat ?? null;
    let anchorLng: number | null = sub.anchorLng ?? null;

    if (typeof address === "string" && address.trim()) {
      const coords = await geocodeVenue(address.trim());
      anchorLat = coords.lat;
      anchorLng = coords.lng;
    }

    const radiusMiles = [1, 3, 5].includes(Number(rawRadius)) ? Number(rawRadius) : 3;
    const walkableOnly = rawWalkable === true || rawWalkable === "true";

    await db
      .update(subscribersTable)
      .set({ anchorLat, anchorLng, radiusMiles, walkableOnly })
      .where(and(eq(subscribersTable.email, email), eq(subscribersTable.tenantId, req.tenant!.id)));

    req.log.info({ email, anchorLat, anchorLng, radiusMiles, walkableOnly }, "Subscriber preferences saved");

    const found = anchorLat !== null;
    res.json({
      success: true,
      message: found
        ? "Location saved! Your future digests will show nearby events."
        : "Preferences saved. We couldn't locate that address — try adding city and state.",
      anchorLat,
      anchorLng,
    });
  } catch (err) {
    req.log.error({ err }, "Error saving preferences");
    res.status(500).json({ error: "server_error", message: "Failed to save preferences" });
  }
});

export default router;
