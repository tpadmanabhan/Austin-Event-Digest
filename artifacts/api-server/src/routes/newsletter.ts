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
import { sendEmail, sendWelcomeEmail, sendNewSubscriberAdminNotification, sendFeatureInterestEmails } from "../lib/emailService";
import { verifyTurnstileToken } from "../lib/turnstile";
import { requireAdmin } from "../middleware/requireAdmin";
import { awardXP } from "../lib/gamification";
import { geocodeVenue } from "../lib/geocodeVenue";
import { verifySubscriberToken } from "../lib/subscriberToken";

const router: IRouter = Router();

/** Escapes HTML special characters to prevent injection in email bodies. */
function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

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

  const { email, birthMonth, birthDay, address, radiusMiles, walkableOnly } = parseResult.data as any;
  const tenantId = req.tenant!.id;
  const isAustin = req.tenant?.slug === "austin";

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
        sendNewSubscriberAdminNotification({ subscriberEmail: email, subscriberName: updated[0].name, isResubscribe: true, adminEmail: req.tenant!.adminEmail, tenantName: req.tenant!.name }).catch(() => {});
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
    sendNewSubscriberAdminNotification({ subscriberEmail: email, subscriberName: null, adminEmail: req.tenant!.adminEmail, tenantName: req.tenant!.name }).catch(() => {});
    awardXP(tenantId, "subscriber", 3, { email }).catch(() => {});

    // Fire-and-forget: geocode the address provided at subscribe time (Austin only)
    if (isAustin && address?.trim()) {
      geocodeVenue(address.trim()).then(async (coords) => {
        if (coords) {
          await db.update(subscribersTable)
            .set({
              anchorLat: coords.lat,
              anchorLng: coords.lng,
              anchorDisplayAddress: address.trim(),
              radiusMiles: radiusMiles ?? 3,
              walkableOnly: walkableOnly ?? false,
            })
            .where(and(eq(subscribersTable.email, email), eq(subscribersTable.tenantId, tenantId)));
        }
      }).catch(() => {});
    }
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
        radiusMiles: s.radiusMiles ?? null,
        walkableOnly: s.walkableOnly ?? false,
        displayAddress: s.anchorDisplayAddress ?? null,
      })),
      total: subscribers.filter(s => s.isActive).length,
    });
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Error fetching subscribers");
    res.status(500).json({ error: "server_error", message: "Failed to fetch subscribers" });
  }
});

// Admin-only: manually add a single subscriber (no captcha required)
router.post("/subscribers/add", requireAdmin, async (req, res) => {
  const { email: rawEmail, name: rawName } = req.body || {};
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  const name = typeof rawName === "string" ? rawName.trim() || null : null;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "invalid_request", message: "A valid email address is required." });
    return;
  }

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
        await db.update(subscribersTable)
          .set({ isActive: true, ...(name ? { name } : {}) })
          .where(and(eq(subscribersTable.email, email), eq(subscribersTable.tenantId, tenantId)));
        res.json({ success: true, message: "Subscriber re-activated.", reactivated: true });
        return;
      }
      res.json({ success: true, message: "Already subscribed.", alreadyExists: true });
      return;
    }

    await db.insert(subscribersTable)
      .values({ tenantId, email, name, isActive: true });

    res.json({ success: true, message: "Subscriber added." });
  } catch (err) {
    req.log.error({ err }, "Error adding subscriber manually");
    res.status(500).json({ error: "server_error", message: "Failed to add subscriber." });
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

// POST /newsletter/business-inquiry — captures "List your business" leads from AustinCares
router.post("/business-inquiry", async (req, res) => {
  // Require a valid Turnstile token before sending any email
  const captchaOk = await verifyTurnstileToken(req.body?.captchaToken, req.ip);
  if (!captchaOk) {
    res.status(400).json({ error: "captcha_failed", message: "CAPTCHA verification failed. Please try again." });
    return;
  }

  const { businessName, email, dealDescription, dayOfWeek } = req.body ?? {};

  const emailStr = typeof email === "string" ? email.trim().toLowerCase() : "";
  const nameStr = typeof businessName === "string" ? businessName.trim() : "";
  const dealStr = typeof dealDescription === "string" ? dealDescription.trim() : "";
  const dayStr = typeof dayOfWeek === "string" ? dayOfWeek.trim() : "";

  if (!emailStr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
    res.status(400).json({ error: "invalid_request", message: "A valid email address is required." });
    return;
  }
  if (!nameStr) {
    res.status(400).json({ error: "invalid_request", message: "Business name is required." });
    return;
  }

  try {
    const adminEmail = req.tenant?.adminEmail || "AIimplementationclubaustin@gmail.com";

    // Admin notification — awaited so a delivery failure is surfaced to the caller
    const adminResult = await sendEmail({
      to: adminEmail,
      subject: `🏷️ New business listing inquiry: ${nameStr}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h2 style="margin:0 0 16px;color:#1c1917;">New Business Listing Inquiry</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:8px 0;color:#78716c;width:120px;">Business</td><td style="padding:8px 0;font-weight:600;">${esc(nameStr)}</td></tr>
            <tr><td style="padding:8px 0;color:#78716c;">Email</td><td style="padding:8px 0;"><a href="mailto:${encodeURIComponent(emailStr)}">${esc(emailStr)}</a></td></tr>
            ${dealStr ? `<tr><td style="padding:8px 0;color:#78716c;vertical-align:top;">Deal</td><td style="padding:8px 0;">${esc(dealStr)}</td></tr>` : ""}
            ${dayStr ? `<tr><td style="padding:8px 0;color:#78716c;">Day</td><td style="padding:8px 0;">${esc(dayStr)}</td></tr>` : ""}
          </table>
          <p style="margin:24px 0 0;font-size:13px;color:#78716c;">Reply directly to this email to follow up with the business.</p>
        </div>
      `,
      replyTo: emailStr,
    });

    if (!adminResult.success) {
      req.log.error({ adminEmail, businessName: nameStr }, "Business inquiry admin notification failed to send");
      res.status(503).json({ error: "email_failed", message: "We couldn't record your inquiry right now — please try again in a moment." });
      return;
    }

    // Confirmation to the business — best-effort; failure is logged but not surfaced
    sendEmail({
      to: emailStr,
      subject: "Thanks for your interest in AustinCares! 🏷️",
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h2 style="margin:0 0 12px;color:#1c1917;">We got your inquiry, ${esc(nameStr)}!</h2>
          <p style="color:#57534e;line-height:1.6;">Thanks for reaching out about listing your business on AustinCares. We'll be in touch within a couple of business days to get your deal set up.</p>
          <p style="color:#57534e;line-height:1.6;">In the meantime, feel free to reply to this email with any questions.</p>
          <p style="margin:24px 0 0;color:#78716c;font-size:13px;">— The AustinCares team</p>
        </div>
      `,
    }).catch((err: unknown) => { req.log.warn({ err, email: emailStr }, "Business inquiry confirmation email failed (best-effort)"); });

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error handling business inquiry");
    res.status(500).json({ error: "server_error", message: "Failed to submit inquiry. Please try again." });
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
        displayAddress: sub.anchorDisplayAddress ?? null,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching preferences");
    res.status(500).json({ error: "server_error", message: "Failed to fetch preferences" });
  }
});

router.post("/preferences", async (req, res) => {
  const { email: rawEmail, token, address, radiusMiles: rawRadius, walkableOnly: rawWalkable, clearLocation } = req.body || {};

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

    // Handle clear location request
    if (clearLocation === true) {
      await db
        .update(subscribersTable)
        .set({ anchorLat: null, anchorLng: null, anchorDisplayAddress: null })
        .where(and(eq(subscribersTable.email, email), eq(subscribersTable.tenantId, req.tenant!.id)));

      req.log.info({ email }, "Subscriber location cleared");

      res.json({
        success: true,
        message: "Location cleared. Your future digests will show all events.",
        anchorLat: null,
        anchorLng: null,
        displayAddress: null,
      });
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

    // Store the typed address string as the display label when geocoding succeeds
    const anchorDisplayAddress = anchorLat !== null && typeof address === "string" && address.trim()
      ? address.trim()
      : (anchorLat !== null ? (sub.anchorDisplayAddress ?? null) : null);

    await db
      .update(subscribersTable)
      .set({ anchorLat, anchorLng, radiusMiles, walkableOnly, anchorDisplayAddress })
      .where(and(eq(subscribersTable.email, email), eq(subscribersTable.tenantId, req.tenant!.id)));

    req.log.info({ email, anchorLat, anchorLng, radiusMiles, walkableOnly, anchorDisplayAddress }, "Subscriber preferences saved");

    const found = anchorLat !== null;
    res.json({
      success: true,
      message: found
        ? "Location saved! Your future digests will show nearby events."
        : "Preferences saved. We couldn't locate that address — try adding city and state.",
      anchorLat,
      anchorLng,
      displayAddress: anchorDisplayAddress,
    });
  } catch (err) {
    req.log.error({ err }, "Error saving preferences");
    res.status(500).json({ error: "server_error", message: "Failed to save preferences" });
  }
});

export default router;
