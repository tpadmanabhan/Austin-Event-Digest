import { Router, type IRouter } from "express";
import { db, rsvpsTable, digestsTable, tenantsTable, adminOtpsTable, type InsertTenant, type EventItem } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { isStaleEvent } from "../lib/dailyCleanup";
import { sql as drizzleSql } from "drizzle-orm";
import { createHash, randomInt } from "crypto";
import { sendRsvpGroupNotification, buildDigestEmailHtml, sendWelcomeEmail, sendEmail } from "../lib/emailService";
import { verifyTurnstileToken } from "../lib/turnstile";
import { requireAdmin, adminTokenForHash, adminTokenForEmail } from "../middleware/requireAdmin";
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

  // Primary: verify against stored scrypt hash
  let valid = await verifyPassword(password, req.tenant.passwordHash);

  // Fallback: direct comparison against ADMIN_PASSWORD env var (handles hash migration lag)
  if (!valid && process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) {
    valid = true;
  }

  if (!valid) {
    res.status(401).json({ error: "unauthorized", message: "Incorrect password" });
    return;
  }

  const token = adminTokenForHash(req.tenant.passwordHash);
  res.json({ token });
});

router.post("/verify", (req, res) => {
  const { token } = req.body ?? {};

  if (!token || typeof token !== "string") {
    res.status(401).json({ valid: false });
    return;
  }

  // Check password-based token
  if (req.tenant?.passwordHash) {
    const expected = adminTokenForHash(req.tenant.passwordHash);
    if (token === expected) { res.json({ valid: true }); return; }
  }

  // Check email-based token
  if (req.tenant?.adminEmail && req.tenant.id) {
    const expected = adminTokenForEmail(req.tenant.adminEmail, req.tenant.id);
    if (expected && token === expected) { res.json({ valid: true }); return; }
  }

  res.status(401).json({ valid: false });
});

// ── OTP rate limiting ──────────────────────────────────────────────────────
const otpRateLimitMap = new Map<string, number[]>();
const OTP_RATE_LIMIT_MAX = 5;
const OTP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isOtpRateLimited(key: string): boolean {
  const now = Date.now();
  const prev = (otpRateLimitMap.get(key) || []).filter(t => now - t < OTP_RATE_LIMIT_WINDOW_MS);
  if (prev.length >= OTP_RATE_LIMIT_MAX) return true;
  otpRateLimitMap.set(key, [...prev, now]);
  return false;
}

// Verify attempt tracking — limited to 10 per tenant+IP per 15 min
const otpVerifyAttemptMap = new Map<string, number[]>();
const OTP_VERIFY_MAX = 10;

function isVerifyAttemptLimited(key: string): boolean {
  const now = Date.now();
  const prev = (otpVerifyAttemptMap.get(key) || []).filter(t => now - t < OTP_RATE_LIMIT_WINDOW_MS);
  if (prev.length >= OTP_VERIFY_MAX) return true;
  otpVerifyAttemptMap.set(key, [...prev, now]);
  return false;
}

// Request OTP — sends a 6-digit code to the tenant's adminEmail
router.post("/request-otp", async (req, res) => {
  if (!req.tenant) {
    res.status(404).json({ error: "not_found", message: "Admin login requires a city subdomain" });
    return;
  }

  const captchaOk = await verifyTurnstileToken(req.body?.captchaToken, req.ip);
  if (!captchaOk) {
    res.status(400).json({ error: "captcha_failed", message: "CAPTCHA verification failed. Please try again." });
    return;
  }

  const { email } = req.body ?? {};
  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "invalid_request", message: "email is required" });
    return;
  }

  // Rate limit by tenant + IP to prevent abuse
  const rateLimitKey = `${req.tenant.id}:${req.ip ?? "unknown"}`;
  if (isOtpRateLimited(rateLimitKey)) {
    // Return generic response to avoid timing attacks
    res.json({ success: true });
    return;
  }

  // Always return success to prevent email enumeration
  if (!req.tenant.adminEmail || email.toLowerCase() !== req.tenant.adminEmail.toLowerCase()) {
    req.log.info({ tenantId: req.tenant.id }, "OTP requested for non-admin email (ignored)");
    res.json({ success: true });
    return;
  }

  try {
    // Generate 6-digit code
    const code = String(randomInt(100000, 999999));
    const otpHash = createHash("sha256").update(code).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Atomically upsert — unique index on tenant_id enforces single active OTP
    await db.insert(adminOtpsTable)
      .values({ tenantId: req.tenant.id, otpHash, expiresAt })
      .onConflictDoUpdate({
        target: adminOtpsTable.tenantId,
        set: { otpHash, expiresAt, createdAt: new Date() },
      });

    // Send OTP email
    const cityName = req.tenant.name;
    await sendEmail({
      to: req.tenant.adminEmail,
      subject: `Your ${cityName} admin login code: ${code}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family:system-ui,sans-serif;background:#f5f5f5;margin:0;padding:32px 16px;">
          <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <p style="font-size:32px;text-align:center;margin:0 0 16px;">🔐</p>
            <h1 style="font-size:22px;font-weight:700;text-align:center;color:#111;margin:0 0 8px;">Admin login code</h1>
            <p style="color:#555;font-size:15px;text-align:center;margin:0 0 24px;">Use this code to sign in to your <strong>${cityName}</strong> admin panel. It expires in 10 minutes.</p>
            <div style="text-align:center;margin:0 0 24px;">
              <span style="display:inline-block;background:#f4f0ff;color:#7c3aed;font-size:36px;font-weight:900;letter-spacing:8px;padding:16px 32px;border-radius:12px;font-family:monospace;">${code}</span>
            </div>
            <p style="color:#999;font-size:12px;text-align:center;margin:0;line-height:1.6;">
              If you didn't request this, you can safely ignore this email.<br>
              Do not share this code with anyone.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    req.log.info({ tenantId: req.tenant.id }, "OTP sent to admin email");
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error sending OTP");
    res.status(500).json({ error: "server_error", message: "Failed to send login code" });
  }
});

// Verify OTP — exchange code for admin session token
router.post("/verify-otp", async (req, res) => {
  if (!req.tenant) {
    res.status(404).json({ error: "not_found", message: "Requires a city subdomain" });
    return;
  }

  const { email, otp } = req.body ?? {};
  if (!email || typeof email !== "string" || !otp || typeof otp !== "string") {
    res.status(400).json({ error: "invalid_request", message: "email and otp are required" });
    return;
  }

  // Attempt throttling — prevents brute-force guessing of 6-digit codes
  const attemptKey = `${req.tenant.id}:${req.ip ?? "unknown"}`;
  if (isVerifyAttemptLimited(attemptKey)) {
    res.status(429).json({ error: "too_many_attempts", message: "Too many attempts. Please wait before trying again." });
    return;
  }

  if (!req.tenant.adminEmail || email.toLowerCase() !== req.tenant.adminEmail.toLowerCase()) {
    res.status(401).json({ error: "unauthorized", message: "Invalid code" });
    return;
  }

  try {
    // Fetch latest un-expired OTP at DB level — unique index guarantees at most one row
    const [stored] = await db
      .select()
      .from(adminOtpsTable)
      .where(
        and(
          eq(adminOtpsTable.tenantId, req.tenant.id),
          gte(adminOtpsTable.expiresAt, drizzleSql`NOW()`)
        )
      )
      .orderBy(desc(adminOtpsTable.createdAt), desc(adminOtpsTable.id))
      .limit(1);

    if (!stored) {
      // Also clean up any lingering expired rows
      await db.delete(adminOtpsTable).where(eq(adminOtpsTable.tenantId, req.tenant.id));
      res.status(401).json({ error: "unauthorized", message: "Code expired or not found. Please request a new one." });
      return;
    }

    const submittedHash = createHash("sha256").update(otp.trim()).digest("hex");
    if (submittedHash !== stored.otpHash) {
      res.status(401).json({ error: "unauthorized", message: "Invalid code" });
      return;
    }

    // Consume the OTP (single-use)
    await db.delete(adminOtpsTable).where(eq(adminOtpsTable.id, stored.id));

    const token = adminTokenForEmail(req.tenant.adminEmail, req.tenant.id);
    if (!token) {
      req.log.error({ tenantId: req.tenant.id }, "RSVP_HMAC_SECRET not set — email admin login disabled");
      res.status(500).json({ error: "server_error", message: "Email admin login is not configured on this server" });
      return;
    }
    req.log.info({ tenantId: req.tenant.id }, "Email OTP verified — admin session granted");
    res.json({ token });
  } catch (err) {
    req.log.error({ err }, "Error verifying OTP");
    res.status(500).json({ error: "server_error", message: "Failed to verify code" });
  }
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

    const events = (digest.events as Record<string, unknown>[]) || [];
    const event = events.find((e: any) => e.title === eventTitle)
      ?? events.find((e: any) =>
        e.title.toLowerCase().includes(eventTitle.toLowerCase()) ||
        eventTitle.toLowerCase().includes(e.title.toLowerCase())
      );
    if (!event) {
      res.status(404).json({ error: "not_found", message: "Event not found in digest" });
      return;
    }

    const since = new Date(digest.weekOf);
    const rsvps = await db
      .select()
      .from(rsvpsTable)
      .where(and(eq(rsvpsTable.tenantId, tenantId), gte(rsvpsTable.createdAt, since)))
      .orderBy(rsvpsTable.createdAt);

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
          eventTitle: String(event.title ?? ""),
          eventDate: String(event.date ?? ""),
          eventVenue: String(event.venue ?? ""),
          newsletterName: req.tenant!.name,
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
      const events = (digest.events as Record<string, unknown>[]) || [];
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

// Return rendered email HTML for a digest — used by the admin preview pane
router.get("/digest/:id/preview-html", requireAdmin, async (req, res) => {
  const digestId = parseInt(String(req.params.id), 10);
  if (isNaN(digestId)) {
    res.status(400).json({ error: "invalid_request", message: "Invalid digest ID" });
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

    const siteUrl = `https://${req.tenant!.slug}.eventcarpooling.com`;
    const html = buildDigestEmailHtml(
      {
        subject: digest.subject,
        intro: digest.intro,
        weekOf: digest.weekOf,
        events: (digest.events as any[]) || [],
        digestId: digest.id,
        siteUrl,
      },
      "Preview Reader",
      undefined,
      req.tenant ?? undefined,
    );

    res.json({ html });
  } catch (err) {
    req.log.error({ err }, "Error building digest preview HTML");
    res.status(500).json({ error: "server_error", message: "Failed to build preview" });
  }
});

// Dismiss first-run banner after initial digest generation
router.post("/dismiss-first-run", requireAdmin, async (req, res) => {
  const tenantId = req.tenant!.id;
  try {
    await db
      .update(tenantsTable)
      .set({ firstRun: false })
      .where(eq(tenantsTable.id, tenantId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error dismissing first-run");
    res.status(500).json({ error: "server_error" });
  }
});

// Fetch current tenant settings (for prefilling the admin settings form)
router.get("/settings", requireAdmin, async (req, res) => {
  const tenantId = req.tenant!.id;
  try {
    const [tenant] = await db
      .select({
        slug: tenantsTable.slug,
        name: tenantsTable.name,
        city: tenantsTable.city,
        accentColor: tenantsTable.accentColor,
        categories: tenantsTable.categories,
        digestTitle: tenantsTable.digestTitle,
        curatorName: tenantsTable.curatorName,
        adminEmail: tenantsTable.adminEmail,
        heroImageUrl: tenantsTable.heroImageUrl,
        brandIconUrl: tenantsTable.brandIconUrl,
      })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, tenantId))
      .limit(1);

    if (!tenant) {
      res.status(404).json({ error: "not_found", message: "Tenant not found" });
      return;
    }

    res.json({ tenant });
  } catch (err) {
    req.log.error({ err }, "Error fetching tenant settings");
    res.status(500).json({ error: "server_error", message: "Failed to fetch settings" });
  }
});

// Update tenant settings (name, accentColor, categories, curatorName, etc.)
router.patch("/settings", requireAdmin, async (req, res) => {
  const { name, accentColor, categories, adminEmail, digestTitle, curatorName, heroImageUrl, brandIconUrl } = req.body ?? {};
  const tenantId = req.tenant!.id;

  const updates: Record<string, unknown> = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 2) {
      res.status(400).json({ error: "invalid_request", message: "name must be at least 2 characters" });
      return;
    }
    updates.name = name.trim();
  }

  if (accentColor !== undefined) {
    if (typeof accentColor !== "string" || !/^#[0-9a-fA-F]{6}$/.test(accentColor)) {
      res.status(400).json({ error: "invalid_request", message: "accentColor must be a 6-digit hex color" });
      return;
    }
    updates.accentColor = accentColor;
  }

  const allowed = new Set(["Tech", "Music", "Food", "Wellness", "Civics", "Sports"]);
  if (categories !== undefined) {
    if (!Array.isArray(categories) || categories.length === 0 || !categories.every((c: unknown) => typeof c === "string" && allowed.has(c))) {
      res.status(400).json({ error: "invalid_request", message: "categories must be a non-empty array of valid category names" });
      return;
    }
    updates.categories = categories;
  }

  if (adminEmail !== undefined) {
    if (typeof adminEmail !== "string" || !adminEmail.includes("@")) {
      res.status(400).json({ error: "invalid_request", message: "adminEmail must be a valid email address" });
      return;
    }
    updates.adminEmail = adminEmail.trim().toLowerCase();
  }

  if (digestTitle !== undefined) {
    if (digestTitle !== null && (typeof digestTitle !== "string" || digestTitle.trim().length === 0)) {
      res.status(400).json({ error: "invalid_request", message: "digestTitle must be a non-empty string or null" });
      return;
    }
    updates.digestTitle = digestTitle === null ? null : digestTitle.trim();
  }

  if (curatorName !== undefined) {
    if (curatorName !== null && typeof curatorName !== "string") {
      res.status(400).json({ error: "invalid_request", message: "curatorName must be a string or null" });
      return;
    }
    updates.curatorName = curatorName === null || curatorName.trim().length === 0 ? null : curatorName.trim();
  }

  if (heroImageUrl !== undefined) {
    if (heroImageUrl !== null && typeof heroImageUrl !== "string") {
      res.status(400).json({ error: "invalid_request", message: "heroImageUrl must be a string or null" });
      return;
    }
    updates.heroImageUrl = heroImageUrl;
  }

  if (brandIconUrl !== undefined) {
    if (brandIconUrl !== null && typeof brandIconUrl !== "string") {
      res.status(400).json({ error: "invalid_request", message: "brandIconUrl must be a string or null" });
      return;
    }
    updates.brandIconUrl = brandIconUrl;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "invalid_request", message: "No valid fields to update" });
    return;
  }

  try {
    const [updated] = await db
      .update(tenantsTable)
      .set(updates as Partial<InsertTenant>)
      .where(eq(tenantsTable.id, tenantId))
      .returning({
        slug: tenantsTable.slug,
        name: tenantsTable.name,
        city: tenantsTable.city,
        accentColor: tenantsTable.accentColor,
        categories: tenantsTable.categories,
        digestTitle: tenantsTable.digestTitle,
        curatorName: tenantsTable.curatorName,
        heroImageUrl: tenantsTable.heroImageUrl,
        brandIconUrl: tenantsTable.brandIconUrl,
      });
    res.json({ tenant: updated });
  } catch (err) {
    req.log.error({ err }, "Error updating tenant settings");
    res.status(500).json({ error: "server_error", message: "Failed to update settings" });
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

router.get("/rsvps", requireAdmin, async (req, res) => {
  const tenantId = req.tenant!.id;
  const since = new Date("2026-06-25T00:00:00Z");
  try {
    const rsvps = await db
      .select()
      .from(rsvpsTable)
      .where(and(eq(rsvpsTable.tenantId, tenantId), gte(rsvpsTable.createdAt, since)))
      .orderBy(rsvpsTable.createdAt);

    // For each RSVP, compute how many carpool-match emails were sent to *other* people
    // for the same event (= number of RSVPs that came before this one for the same event)
    type RsvpRow = typeof rsvps[number];
    const byEvent = new Map<string, RsvpRow[]>();
    for (const r of rsvps) {
      const key = `${r.digestId}::${r.eventTitle}`;
      if (!byEvent.has(key)) byEvent.set(key, []);
      byEvent.get(key)!.push(r);
    }

    const enriched = rsvps.map((r) => {
      const key = `${r.digestId}::${r.eventTitle}`;
      const group = byEvent.get(key)!.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const position = group.findIndex((x) => x.id === r.id);
      return {
        id: r.id,
        eventTitle: r.eventTitle,
        digestId: r.digestId,
        email: r.email,
        name: r.name,
        createdAt: r.createdAt.toISOString(),
        emailsSent: {
          adminNotified: true,
          carpoolMatchCount: position,
        },
      };
    }).reverse();

    res.json({ success: true, rsvps: enriched, total: enriched.length });
  } catch (err) {
    req.log.error({ err }, "Error fetching RSVPs");
    res.status(500).json({ error: "server_error", message: "Failed to fetch RSVPs" });
  }
});

// Manually clean past events from the current tenant's latest digest
router.post("/digest/cleanup-latest", requireAdmin, async (req, res) => {
  const tenantId = req.tenant!.id;
  try {
    const [latest] = await db
      .select({ id: digestsTable.id, events: digestsTable.events, weekOf: digestsTable.weekOf })
      .from(digestsTable)
      .where(eq(digestsTable.tenantId, tenantId))
      .orderBy(desc(digestsTable.weekOf), desc(digestsTable.id))
      .limit(1);

    if (!latest) {
      res.status(404).json({ error: "not_found", message: "No digest found" });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekOf = new Date(latest.weekOf);
    weekOf.setHours(0, 0, 0, 0);

    const events = (latest.events as Record<string, unknown>[]) || [];
    const fresh = events.filter(ev => !isStaleEvent(ev, today, weekOf));
    const removed = events.length - fresh.length;

    if (removed > 0) {
      await db
        .update(digestsTable)
        .set({ events: fresh as unknown as EventItem[] })
        .where(eq(digestsTable.id, latest.id));
    }

    req.log.info({ digestId: latest.id, removed }, "Manual cleanup: removed past events from latest digest");
    res.json({ success: true, removed, digestId: latest.id });
  } catch (err) {
    req.log.error({ err }, "Error cleaning up latest digest");
    res.status(500).json({ error: "server_error", message: "Failed to clean up digest" });
  }
});

router.post("/send-test-welcome", requireAdmin, async (req, res) => {
  const { email, name } = req.body ?? {};
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "invalid_request", message: "email is required" });
    return;
  }
  await sendWelcomeEmail(email, name ?? null, req.tenant ?? null);
  res.json({ success: true, sentTo: email });
});

export default router;
