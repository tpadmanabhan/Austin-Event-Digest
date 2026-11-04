import { Router, type IRouter } from "express";
import {
  db,
  rsvpsTable,
  subscribersTable,
  digestsTable,
  leadershipEventsTable,
  leadershipEventRsvpsTable,
  tenantsTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { sendRsvpNotification, sendRsvpGroupNotification, sendCarpoolAdminNotification } from "../lib/emailService";
import { verifyTurnstileToken } from "../lib/turnstile";
import { verifyManagedEventRsvpSignature, verifyRsvpSignature, verifyRsvpSignatureByWeek } from "../lib/rsvpToken";
import { awardXP } from "../lib/gamification";

const router: IRouter = Router();

router.get("/managed", async (req, res) => {
  const managedEventId = Number.parseInt(String(req.query.managedEventId ?? ""), 10);
  if (!Number.isInteger(managedEventId) || managedEventId <= 0) {
    res.status(400).json({ error: "invalid_request", message: "managedEventId is required" });
    return;
  }
  if (!["austin", "leadershipaustin"].includes(req.tenant?.slug ?? "")) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  try {
    const rows = await db
      .select({ id: leadershipEventRsvpsTable.id })
      .from(leadershipEventRsvpsTable)
      .where(and(
        eq(leadershipEventRsvpsTable.tenantId, req.tenant!.id),
        eq(leadershipEventRsvpsTable.leadershipEventId, managedEventId),
      ));
    res.json({ count: rows.length });
  } catch (err) {
    req.log.error({ err, managedEventId }, "Error fetching persistent event interests");
    res.status(500).json({ error: "server_error", message: "Failed to fetch event interests" });
  }
});

router.post("/managed", async (req, res) => {
  const body = req.body ?? {};
  const managedEventId = Number(body.managedEventId);
  const eventTitle = typeof body.eventTitle === "string" ? body.eventTitle.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken : "";
  const sig = typeof body.sig === "string" ? body.sig : "";

  if (!Number.isInteger(managedEventId) || managedEventId <= 0 || !eventTitle || eventTitle.length > 180
    || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    res.status(400).json({ error: "invalid_request", message: "Invalid event interest data" });
    return;
  }
  if (!["austin", "leadershipaustin"].includes(req.tenant?.slug ?? "")) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const normalizedEmail = email.toLowerCase();
  const hasSignature = sig.length > 0;
  const hasCaptcha = captchaToken.length > 0;
  if (!hasSignature && !hasCaptcha) {
    res.status(400).json({ error: "captcha_failed", message: "CAPTCHA verification failed. Please try again." });
    return;
  }

  const tenantSlug = req.tenant!.slug;
  if (hasSignature) {
    if (!verifyManagedEventRsvpSignature(tenantSlug, managedEventId, eventTitle, normalizedEmail, sig)) {
      res.status(403).json({ error: "invalid_signature", message: "Invalid interest link. Please use the link from your email." });
      return;
    }
  } else if (!(await verifyTurnstileToken(captchaToken, req.ip))) {
    res.status(400).json({ error: "captcha_failed", message: "CAPTCHA verification failed. Please try again." });
    return;
  }

  try {
    const [sourceTenant] = await db
      .select({ id: tenantsTable.id })
      .from(tenantsTable)
      .where(eq(tenantsTable.slug, "leadershipaustin"))
      .limit(1);
    if (!sourceTenant) {
      res.status(404).json({ error: "not_found", message: "Source event not found" });
      return;
    }

    const [event] = await db
      .select()
      .from(leadershipEventsTable)
      .where(and(
        eq(leadershipEventsTable.id, managedEventId),
        eq(leadershipEventsTable.tenantId, sourceTenant.id),
        eq(leadershipEventsTable.isActive, true),
      ))
      .limit(1);
    if (!event || event.title !== eventTitle) {
      res.status(404).json({ error: "not_found", message: "Event not found" });
      return;
    }

    const tenantId = req.tenant!.id;
    const priorRsvps = await db
      .select()
      .from(leadershipEventRsvpsTable)
      .where(and(
        eq(leadershipEventRsvpsTable.tenantId, tenantId),
        eq(leadershipEventRsvpsTable.leadershipEventId, managedEventId),
      ));
    const [created] = await db
      .insert(leadershipEventRsvpsTable)
      .values({
        tenantId,
        leadershipEventId: managedEventId,
        email: normalizedEmail,
        name: hasSignature ? (name || null) : null,
      })
      .onConflictDoNothing()
      .returning({ id: leadershipEventRsvpsTable.id });
    const alreadyRsvpd = !created;

    if (created) {
      await db
        .insert(subscribersTable)
        .values({ tenantId, email: normalizedEmail, name: hasSignature ? (name || null) : null, isActive: true })
        .onConflictDoUpdate({
          target: [subscribersTable.tenantId, subscribersTable.email],
          set: { isActive: true, ...(hasSignature && name ? { name } : {}) },
        });

      const rsvperName = (hasSignature ? name : "") || email.split("@")[0];
      for (const prior of priorRsvps) {
        if (prior.email !== normalizedEmail) {
          sendRsvpNotification({
            to: prior.email,
            rsvperName,
            rsvperEmail: normalizedEmail,
            eventTitle: event.title,
            eventDate: event.date,
            eventVenue: event.venue,
            digestSubject: "Upcoming events shared by Leadership Austin alumni",
            newsletterName: req.tenant!.name,
          }).catch(() => {});
        }
      }
      if (priorRsvps.length > 0) {
        sendRsvpGroupNotification({
          to: normalizedEmail,
          matches: priorRsvps.map((prior) => ({ name: prior.name || prior.email.split("@")[0], email: prior.email })),
          eventTitle: event.title,
          eventDate: event.date,
          eventVenue: event.venue,
          newsletterName: req.tenant!.name,
        }).catch(() => {});
      }
      sendCarpoolAdminNotification({
        rsvperEmail: normalizedEmail,
        rsvperName: name || null,
        eventTitle: event.title,
        eventDate: event.date,
        eventVenue: event.venue,
        totalRsvps: priorRsvps.length + 1,
        adminEmail: req.tenant!.adminEmail,
        newsletterName: req.tenant!.name,
      }).catch(() => {});
      awardXP(tenantId, "rsvp", 10, { eventTitle, managedEventId }).catch(() => {});
    }

    const countRows = await db
      .select({ id: leadershipEventRsvpsTable.id })
      .from(leadershipEventRsvpsTable)
      .where(and(
        eq(leadershipEventRsvpsTable.tenantId, tenantId),
        eq(leadershipEventRsvpsTable.leadershipEventId, managedEventId),
      ));
    req.log.info({ managedEventId, tenantId, alreadyRsvpd }, "Persistent event interest recorded");
    res.json({
      success: true,
      message: alreadyRsvpd ? "You already marked yourself interested." : "Interest recorded.",
      count: countRows.length,
      alreadyRsvpd,
    });
  } catch (err) {
    req.log.error({ err, managedEventId }, "Error recording persistent event interest");
    res.status(500).json({ error: "server_error", message: "Failed to record event interest" });
  }
});

router.post("/", async (req, res) => {
  const { digestId, weekOf: weekOfParam, eventTitle, email, name, captchaToken, sig } = req.body ?? {};

  const hasDigestId = typeof digestId === "number" && digestId > 0;
  const hasWeekOf = typeof weekOfParam === "string" && /^\d{4}-\d{2}-\d{2}/.test(weekOfParam);

  if ((!hasDigestId && !hasWeekOf) || !eventTitle || !email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
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
    if (hasWeekOf) {
      // weekOf-based signature: stable across dev/prod environments
      const weekStr = (weekOfParam as string).substring(0, 10);
      if (!verifyRsvpSignatureByWeek(weekStr, eventTitle, normalizedEmail, sig)) {
        res.status(403).json({ error: "invalid_signature", message: "Invalid RSVP link. Please use the link from your email." });
        return;
      }
    } else {
      // Legacy: numeric digestId-based HMAC signature
      if (!verifyRsvpSignature(digestId, eventTitle, normalizedEmail, name, sig)) {
        res.status(403).json({ error: "invalid_signature", message: "Invalid RSVP link. Please use the link from your email." });
        return;
      }
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

  const tenantId = req.tenant!.id;

  try {
    // Resolve digest: weekOf-based lookup (stable across environments) or legacy numeric ID
    let digest;
    if (hasWeekOf) {
      const weekStr = (weekOfParam as string).substring(0, 10);
      [digest] = await db
        .select()
        .from(digestsTable)
        .where(and(
          eq(digestsTable.tenantId, tenantId),
          sql`DATE(${digestsTable.weekOf}) = ${weekStr}::date`,
        ))
        .limit(1);
    } else {
      [digest] = await db
        .select()
        .from(digestsTable)
        .where(and(eq(digestsTable.id, digestId), eq(digestsTable.tenantId, tenantId)))
        .limit(1);
    }
    // Resolved numeric ID used for all subsequent DB operations
    const resolvedDigestId: number = digest?.id ?? digestId;

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
        eq(rsvpsTable.tenantId, tenantId),
        eq(rsvpsTable.digestId, resolvedDigestId),
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
          eq(rsvpsTable.tenantId, tenantId),
          eq(rsvpsTable.digestId, resolvedDigestId),
          eq(rsvpsTable.eventTitle, eventTitle),
        ));

      await db.insert(rsvpsTable).values({
        tenantId,
        digestId: resolvedDigestId,
        eventTitle,
        email: normalizedEmail,
        name: resolvedName,
      });

      // Auto-subscribe the RSVPer to the weekly newsletter (both web form and email link flows).
      // CAPTCHA proves the submitter is human; email link proves identity via HMAC.
      await db
        .insert(subscribersTable)
        .values({ tenantId, email: normalizedEmail, name: resolvedName, isActive: true })
        .onConflictDoUpdate({
          target: [subscribersTable.tenantId, subscribersTable.email],
          set: { isActive: true, ...(resolvedName ? { name: resolvedName } : {}) },
        });

      // Use the submitted name for display in carpool emails even for CAPTCHA submissions
      // (name is not verified via CAPTCHA, but the CAPTCHA proves the submitter is human).
      const rsvperName = resolvedName || name || (email as string).split("@")[0];

      // Notify each prior RSVPer (one email each) that the new person also wants to carpool.
      // Fires for both signed-link and CAPTCHA submissions so no match goes unannounced.
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
            newsletterName: req.tenant!.name,
          }).catch(() => {});
        }
      }

      // Notify the new RSVPer with ONE consolidated email listing everyone already interested.
      if (priorRsvps.length > 0) {
        sendRsvpGroupNotification({
          to: normalizedEmail,
          matches: priorRsvps.map(p => ({ name: p.name || p.email.split("@")[0], email: p.email })),
          eventTitle: event.title,
          eventDate: event.date,
          eventVenue: event.venue,
          newsletterName: req.tenant!.name,
        }).catch(() => {});
      }

      // Always notify admin of new carpool signup, regardless of verification method
      sendCarpoolAdminNotification({
        rsvperEmail: normalizedEmail,
        rsvperName: name || resolvedName,
        eventTitle: event.title,
        eventDate: event.date,
        eventVenue: event.venue,
        totalRsvps: priorRsvps.length + 1,
        adminEmail: req.tenant!.adminEmail,
        newsletterName: req.tenant!.name,
      }).catch(() => {});

      req.log.info({ email: normalizedEmail, eventTitle, digestId: resolvedDigestId, carpoolMatches: priorRsvps.length, verifiedBySignature }, "RSVP recorded");
      // Award +10 XP per carpool RSVP. All events are eligible — no featured flag exists.
      // updateStreak is called inside awardXP for "rsvp" before badge check so that
      // streak-based badges (on_a_roll, streak_master) see the fresh streak count.
      awardXP(tenantId, "rsvp", 10, { eventTitle, digestId: resolvedDigestId }).catch(() => {});
    }

    const totalRsvps = await db
      .select()
      .from(rsvpsTable)
      .where(and(
        eq(rsvpsTable.tenantId, tenantId),
        eq(rsvpsTable.digestId, resolvedDigestId),
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

  const tenantId = req.tenant!.id;

  try {
    const rsvps = await db
      .select({ id: rsvpsTable.id })
      .from(rsvpsTable)
      .where(and(
        eq(rsvpsTable.tenantId, tenantId),
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
