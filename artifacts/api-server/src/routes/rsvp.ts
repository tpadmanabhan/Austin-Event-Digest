import { Router, type IRouter } from "express";
import { db, rsvpsTable, subscribersTable, digestsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { sendRsvpNotification } from "../lib/emailService";

const router: IRouter = Router();

router.post("/", async (req, res) => {
  const { digestId, eventTitle, email, name } = req.body ?? {};

  if (!digestId || typeof digestId !== "number" || !eventTitle || !email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    res.status(400).json({ error: "invalid_request", message: "Invalid RSVP data" });
    return;
  }
  const normalizedEmail = email.toLowerCase();

  try {
    const [digest] = await db.select().from(digestsTable).where(eq(digestsTable.id, digestId)).limit(1);
    if (!digest) {
      res.status(404).json({ error: "not_found", message: "Digest not found" });
      return;
    }

    const events = (digest.events as any[]) || [];
    const event = events.find((e: any) => e.title === eventTitle);
    if (!event) {
      res.status(404).json({ error: "not_found", message: "Event not found in digest" });
      return;
    }

    const existing = await db
      .select()
      .from(rsvpsTable)
      .where(and(
        eq(rsvpsTable.digestId, digestId),
        eq(rsvpsTable.eventTitle, eventTitle),
        eq(rsvpsTable.email, normalizedEmail),
      ))
      .limit(1);

    let alreadyRsvpd = existing.length > 0;

    if (!alreadyRsvpd) {
      await db.insert(rsvpsTable).values({
        digestId,
        eventTitle,
        email: normalizedEmail,
        name: name || null,
      });
    }

    const allRsvps = await db
      .select()
      .from(rsvpsTable)
      .where(and(
        eq(rsvpsTable.digestId, digestId),
        eq(rsvpsTable.eventTitle, eventTitle),
      ));

    if (!alreadyRsvpd) {
      const subscribers = await db
        .select()
        .from(subscribersTable)
        .where(eq(subscribersTable.isActive, true));

      const others = subscribers.filter(s => s.email.toLowerCase() !== normalizedEmail);
      const rsvperName = name || email.split("@")[0];

      for (const subscriber of others) {
        sendRsvpNotification({
          to: subscriber.email,
          rsvperName,
          eventTitle: event.title,
          eventDate: event.date,
          eventVenue: event.venue,
          digestSubject: digest.subject,
        }).catch(() => {});
      }

      req.log.info({ email: normalizedEmail, eventTitle, digestId }, "RSVP recorded");
    }

    res.json({
      success: true,
      message: alreadyRsvpd ? "You already RSVPd!" : "RSVP recorded!",
      count: allRsvps.length,
      alreadyRsvpd,
    });
  } catch (err) {
    req.log.error({ err }, "Error creating RSVP");
    res.status(500).json({ error: "server_error", message: "Failed to record RSVP" });
  }
});

router.get("/", async (req, res) => {
  const digestId = parseInt(req.query.digestId as string);
  const eventTitle = req.query.eventTitle as string;

  if (isNaN(digestId) || !eventTitle) {
    res.status(400).json({ error: "invalid_request", message: "digestId and eventTitle are required" });
    return;
  }

  try {
    const rsvps = await db
      .select()
      .from(rsvpsTable)
      .where(and(
        eq(rsvpsTable.digestId, digestId),
        eq(rsvpsTable.eventTitle, eventTitle),
      ));

    res.json({
      count: rsvps.length,
      rsvps: rsvps.map(r => ({ name: r.name, createdAt: r.createdAt })),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching RSVPs");
    res.status(500).json({ error: "server_error", message: "Failed to fetch RSVPs" });
  }
});

export default router;
