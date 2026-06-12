import { Router, type IRouter } from "express";
import { db, subscribersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  SubscribeToNewsletterBody,
  UnsubscribeFromNewsletterBody,
  SubscribeToNewsletterResponse,
  UnsubscribeFromNewsletterResponse,
  GetSubscribersResponse,
} from "@workspace/api-zod";
import { sendWelcomeEmail, sendNewSubscriberAdminNotification } from "../lib/emailService";
import { verifyTurnstileToken } from "../lib/turnstile";

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

  const { email, name } = parseResult.data;

  try {
    const existing = await db
      .select()
      .from(subscribersTable)
      .where(eq(subscribersTable.email, email))
      .limit(1);

    if (existing.length > 0) {
      const sub = existing[0];
      if (!sub.isActive) {
        await db
          .update(subscribersTable)
          .set({ isActive: true, name: name ?? sub.name })
          .where(eq(subscribersTable.email, email));

        const updated = await db
          .select()
          .from(subscribersTable)
          .where(eq(subscribersTable.email, email))
          .limit(1);

        const response = SubscribeToNewsletterResponse.parse({
          success: true,
          message: "Welcome back! You've been re-subscribed.",
          subscriber: {
            id: updated[0].id,
            email: updated[0].email,
            name: updated[0].name,
            subscribedAt: updated[0].subscribedAt,
            isActive: updated[0].isActive,
          },
        });
        res.json(response);
        sendWelcomeEmail(email, name ?? updated[0].name).catch(() => {});
        sendNewSubscriberAdminNotification({ subscriberEmail: email, subscriberName: name ?? updated[0].name, isResubscribe: true }).catch(() => {});
        return;
      }

      const response = SubscribeToNewsletterResponse.parse({
        success: true,
        message: "You're already subscribed!",
        subscriber: {
          id: sub.id,
          email: sub.email,
          name: sub.name,
          subscribedAt: sub.subscribedAt,
          isActive: sub.isActive,
        },
      });
      res.json(response);
      return;
    }

    const [newSub] = await db
      .insert(subscribersTable)
      .values({ email, name: name || null, isActive: true })
      .returning();

    const response = SubscribeToNewsletterResponse.parse({
      success: true,
      message: "You're subscribed! You'll receive Raj's Austin Events every Sunday.",
      subscriber: {
        id: newSub.id,
        email: newSub.email,
        name: newSub.name,
        subscribedAt: newSub.subscribedAt,
        isActive: newSub.isActive,
      },
    });
    res.json(response);
    sendWelcomeEmail(email, name ?? null).catch(() => {});
    sendNewSubscriberAdminNotification({ subscriberEmail: email, subscriberName: name ?? null }).catch(() => {});
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

  try {
    await db
      .update(subscribersTable)
      .set({ isActive: false })
      .where(eq(subscribersTable.email, email));

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

router.get("/subscribers", async (req, res) => {
  try {
    const subscribers = await db
      .select()
      .from(subscribersTable)
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

export default router;
