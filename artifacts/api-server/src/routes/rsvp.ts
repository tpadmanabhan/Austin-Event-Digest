import { Router, type IRouter } from "express";
import { db, rsvpsTable, subscribersTable, digestsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { sendRsvpNotification, sendRsvpGroupNotification, sendCarpoolAdminNotification } from "../lib/emailService";
import { verifyTurnstileToken } from "../lib/turnstile";
import { verifyRsvpSignature } from "../lib/rsvpToken";

const router: IRouter = Router();

router.post("/", async (req, res) => {
  const { digestId, eventTitle, email, name, captchaToken, sig } = req.body ?? {};

  if (!digestId || typeof digestId !== "number" || !eventTitle || !email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    res.status(400).json({ error: "invalid_request", message: "Invalid RSVP data" });
    return;
  }

  const normalizedEmail = (email as string).toLowerCase();

  // Accept either a valid HMAC signature (email link flow) or a valid CAPTCHA (interactive form).
  // Reject if neither is present — this prevents unauthenticated spoofing.
  const hasSig = typeof sig === "string" && sig.length > 0;
  const hasCaptcha = typeof captchaToken === "string" && captchaToken.length > 0;

  if (!hasSig && !hasCaptcha) {
    res.status(400).json({ error: "captcha_failed", message: "CAPTCHA verification failed. Please try again." });
    return;
  }

  // Tracks whether this submission came from a verified (signed) email link.
  let verifiedBySignature = false;

  if (hasSig) {
    // HMAC path: signature covers digestId, eventTitle, email, and name — so name is integrity-protected.
    if (!verifyRsvpSignature(digestId, eventTitle, normalizedEmail, name, sig)) {
      res.status(403).json({ error: "invalid_signature", message: "Invalid RSVP link. Please use the link from your email." });
      return;
    }
    verifiedBySignature = true;
  } else {
    // CAPTCHA path: proves the submitter is human but does not verify email ownership.
    const captchaOk = await verifyTurnstileToken(captchaToken, req.ip);
    if (!captchaOk) {
      res.status(400).json({ error: "captcha_failed", message: "CAPTCHA verification failed. Please try again." });
      return;
    }
  }

  try {
    const [digest] = await db.select().from(digestsTable).where(eq(digestsTable.id, digestId)).limit(1);
    if (!digest) {
      res.status(404).json({ error: "not_found", message: "Digest not found" });
      return;
    }

    const events = (digest.events as any[]) || [];
    // Exact match first; fall back to case-insensitive substring match so links
    // survive minor title edits made after the newsletter was sent.
    const event = events.find((e: any) => e.title === eventTitle)
      ?? events.find((e: any) =>
        e.title.toLowerCase().includes(eventTitle.toLowerCase()) ||
        eventTitle.toLowerCase().includes(e.title.toLowerCase())
      );
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
      // For signed-link submissions, the name is integrity-protected by the HMAC signature.
      // For CAPTCHA submissions, email ownership is not verified, so we store the RSVP silently
      // (no auto-subscription, no outbound match notifications) to prevent spam relay abuse.
      const resolvedName: string | null = verifiedBySignature ? (name || null) : null;

      // Fetch existing RSVPers BEFORE inserting so we know who was already interested
      const priorRsvps = await db
        .select()
        .from(rsvpsTable)
        .where(and(
          eq(rsvpsTable.digestId, digestId),
          eq(rsvpsTable.eventTitle, eventTitle),
        ));

      await db.insert(rsvpsTable).values({
        digestId,
        eventTitle,
        email: normalizedEmail,
        name: resolvedName,
      });

      if (verifiedBySignature) {
        // Auto-subscribe the RSVPer to the weekly newsletter only when identity is verified.
        await db
          .insert(subscribersTable)
          .values({ email: normalizedEmail, name: resolvedName, isActive: true })
          .onConflictDoUpdate({
            target: subscribersTable.email,
            set: { isActive: true, name: resolvedName },
          });

        const rsvperName = resolvedName || (email as string).split("@")[0];

        // Notify each prior RSVPer (one email each) that the new person also wants to carpool
        for (const prior of priorRsvps) {
          if (prior.email.toLowerCase() !== normalizedEmail) {
            sendRsvpNotification({
              to: prior.email,
              rsvperName,
              rsvperEmail: normalizedEmail,
              eventTitle: event.title,
              eventDate: event.date,
              eventVenue: event.venue,
              digestSubject: digest.subject,
            }).catch(() => {});
          }
        }

        // Notify the new RSVPer with ONE consolidated email listing everyone already interested
        if (priorRsvps.length > 0) {
          sendRsvpGroupNotification({
            to: normalizedEmail,
            matches: priorRsvps.map(p => ({ name: p.name || p.email.split("@")[0], email: p.email })),
            eventTitle: event.title,
            eventDate: event.date,
            eventVenue: event.venue,
          }).catch(() => {});
        }
      }

      // Always notify admin of new carpool signup, regardless of verification method
      sendCarpoolAdminNotification({
        rsvperEmail: normalizedEmail,
        rsvperName: name || resolvedName,
        eventTitle: event.title,
        eventDate: event.date,
        eventVenue: event.venue,
        totalRsvps: priorRsvps.length + 1,
      }).catch(() => {});

      req.log.info({ email: normalizedEmail, eventTitle, digestId, carpoolMatches: priorRsvps.length, verifiedBySignature }, "RSVP recorded");
    }

    const totalRsvps = await db
      .select()
      .from(rsvpsTable)
      .where(and(
        eq(rsvpsTable.digestId, digestId),
        eq(rsvpsTable.eventTitle, eventTitle),
      ));

    res.json({
      success: true,
      message: alreadyRsvpd ? "You already RSVPd!" : "RSVP recorded!",
      count: totalRsvps.length,
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
      .select({ id: rsvpsTable.id })
      .from(rsvpsTable)
      .where(and(
        eq(rsvpsTable.digestId, digestId),
        eq(rsvpsTable.eventTitle, eventTitle),
      ));

    res.json({ count: rsvps.length });
  } catch (err) {
    req.log.error({ err }, "Error fetching RSVPs");
    res.status(500).json({ error: "server_error", message: "Failed to fetch RSVPs" });
  }
});

export default router;
