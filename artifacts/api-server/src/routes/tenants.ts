import { Router, type IRouter } from "express";
import { createHmac } from "crypto";
import { db, tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "../lib/passwordHash";
import { requirePlatformRoot } from "../middleware/resolveTenant";
import { sendEmail } from "../lib/emailService";
import { awardXP } from "../lib/gamification";

const router: IRouter = Router();

const RESERVED_SLUGS = new Set([
  "www", "api", "app", "admin", "platform", "mail", "smtp", "ftp",
  "help", "support", "status", "blog", "about", "terms", "privacy",
  "auth", "login", "logout", "signup", "dashboard",
]);

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && slug.length >= 2 && slug.length <= 30;
}

// ── Email verification ──────────────────────────────────────────────────────

function generateVerifyToken(slug: string): string {
  const secret = process.env.RSVP_HMAC_SECRET || "dev-fallback-secret";
  return createHmac("sha256", secret).update(`verify:${slug}`).digest("hex");
}

function isEmailVerificationEnabled(): boolean {
  return !!process.env.RSVP_HMAC_SECRET;
}

async function sendVerificationEmail(slug: string, adminEmail: string): Promise<void> {
  const token = generateVerifyToken(slug);
  const verifyUrl = `https://eventcarpooling.com/api/tenants/verify?slug=${encodeURIComponent(slug)}&token=${encodeURIComponent(token)}`;
  const cityDisplay = slug.charAt(0).toUpperCase() + slug.slice(1);

  await sendEmail({
    to: adminEmail,
    subject: `Verify your ${cityDisplay} Events newsletter`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:system-ui,sans-serif;background:#f5f5f5;margin:0;padding:32px 16px;">
        <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:16px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <p style="font-size:32px;text-align:center;margin:0 0 16px;">🗺️</p>
          <h1 style="font-size:22px;font-weight:700;text-align:center;color:#111;margin:0 0 8px;">Confirm your email</h1>
          <p style="color:#555;font-size:15px;text-align:center;margin:0 0 32px;line-height:1.5;">
            You're one click away from launching <strong>${cityDisplay} Events</strong> on eventcarpooling.com.
          </p>
          <a href="${verifyUrl}"
             style="display:block;text-align:center;background:#7c3aed;color:#fff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 24px;border-radius:12px;">
            Confirm &amp; activate my city →
          </a>
          <p style="color:#999;font-size:12px;text-align:center;margin:24px 0 0;line-height:1.6;">
            If you didn't sign up for this, ignore this email.<br>
            Link expires in 48 hours.
          </p>
        </div>
      </body>
      </html>
    `,
  });
}

// ── Rate limiting ───────────────────────────────────────────────────────────

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const prev = (rateLimitMap.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (prev.length >= RATE_LIMIT_MAX) return true;
  rateLimitMap.set(ip, [...prev, now]);
  return false;
}

// ── Routes ──────────────────────────────────────────────────────────────────

router.get("/tenant/config", async (req, res) => {
  const slug = req.query.slug as string | undefined;
  if (!slug) {
    res.status(400).json({ error: "invalid_request", message: "slug query param is required" });
    return;
  }

  try {
    const [tenant] = await db
      .select({
        slug: tenantsTable.slug,
        name: tenantsTable.name,
        city: tenantsTable.city,
        accentColor: tenantsTable.accentColor,
        categories: tenantsTable.categories,
        firstRun: tenantsTable.firstRun,
      })
      .from(tenantsTable)
      .where(eq(tenantsTable.slug, slug))
      .limit(1);

    if (!tenant) {
      res.status(404).json({ error: "not_found", message: `No tenant found for slug "${slug}"` });
      return;
    }

    res.json({ tenant });
  } catch (err) {
    req.log.error({ err }, "Error fetching tenant config");
    res.status(500).json({ error: "server_error", message: "Failed to fetch tenant config" });
  }
});

router.get("/tenants/list", async (req, res) => {
  try {
    const tenants = await db
      .select({
        slug: tenantsTable.slug,
        name: tenantsTable.name,
        city: tenantsTable.city,
        accentColor: tenantsTable.accentColor,
        categories: tenantsTable.categories,
      })
      .from(tenantsTable)
      .where(eq(tenantsTable.isActive, true))
      .orderBy(tenantsTable.createdAt);

    res.json({ tenants });
  } catch (err) {
    req.log.error({ err }, "Error listing tenants");
    res.status(500).json({ error: "server_error", message: "Failed to list tenants" });
  }
});

router.get("/tenants/check-slug", requirePlatformRoot, async (req, res) => {
  const slug = req.query.slug as string | undefined;
  if (!slug) {
    res.status(400).json({ error: "invalid_request", message: "slug query param is required" });
    return;
  }

  if (!isValidSlug(slug)) {
    res.json({ available: false, reason: "invalid_format" });
    return;
  }

  if (RESERVED_SLUGS.has(slug)) {
    res.json({ available: false, reason: "reserved" });
    return;
  }

  try {
    const [existing] = await db
      .select({ slug: tenantsTable.slug })
      .from(tenantsTable)
      .where(eq(tenantsTable.slug, slug))
      .limit(1);

    res.json({ available: !existing });
  } catch (err) {
    req.log.error({ err }, "Error checking slug availability");
    res.status(500).json({ error: "server_error", message: "Failed to check slug" });
  }
});

router.post("/tenants", requirePlatformRoot, async (req, res) => {
  const { cityName, slug, adminEmail, adminPassword, categories, accentColor } = req.body ?? {};

  if (!cityName || typeof cityName !== "string" || cityName.trim().length < 2) {
    res.status(400).json({ error: "invalid_request", message: "cityName must be at least 2 characters" });
    return;
  }

  if (!slug || !isValidSlug(slug)) {
    res.status(400).json({ error: "invalid_request", message: "slug must be 2-30 lowercase alphanumeric characters or hyphens" });
    return;
  }

  if (RESERVED_SLUGS.has(slug)) {
    res.status(400).json({ error: "invalid_request", message: `"${slug}" is a reserved name` });
    return;
  }

  if (!adminEmail || typeof adminEmail !== "string" || !adminEmail.includes("@")) {
    res.status(400).json({ error: "invalid_request", message: "adminEmail must be a valid email address" });
    return;
  }

  if (!adminPassword || typeof adminPassword !== "string" || adminPassword.length < 8) {
    res.status(400).json({ error: "invalid_request", message: "adminPassword must be at least 8 characters" });
    return;
  }

  const allowedCategories = new Set(["Tech", "Music", "Food", "Wellness", "Civics"]);
  if (!Array.isArray(categories) || categories.length === 0 || !categories.every((c: unknown) => typeof c === "string" && allowedCategories.has(c))) {
    res.status(400).json({ error: "invalid_request", message: "categories must be a non-empty array of valid category names" });
    return;
  }

  // Rate limit by IP
  const clientIp = (req.ip ?? req.socket.remoteAddress ?? "unknown").replace(/^::ffff:/, "");
  if (isRateLimited(clientIp)) {
    res.status(429).json({ error: "rate_limited", message: "Too many signups from this IP. Please try again in an hour." });
    return;
  }

  try {
    const [existing] = await db
      .select({ slug: tenantsTable.slug })
      .from(tenantsTable)
      .where(eq(tenantsTable.slug, slug))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "conflict", message: `The subdomain "${slug}" is already taken` });
      return;
    }

    const passwordHash = await hashPassword(adminPassword);
    const trimmedCity = cityName.trim();
    const tenantName = `${trimmedCity} Events`;
    const color = typeof accentColor === "string" && /^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : "#7c3aed";
    const emailVerificationEnabled = isEmailVerificationEnabled();

    const [tenantRow] = await db
      .insert(tenantsTable)
      .values({
        slug,
        name: tenantName,
        city: trimmedCity,
        accentColor: color,
        categories,
        passwordHash,
        adminEmail: adminEmail.trim().toLowerCase(),
        emailVerified: !emailVerificationEnabled,
        firstRun: true,
        // isActive is false until email verified (when verification is enabled)
        isActive: !emailVerificationEnabled,
      })
      .returning();

    const tenant = {
      slug: tenantRow.slug,
      name: tenantRow.name,
      city: tenantRow.city,
      accentColor: tenantRow.accentColor,
      categories: tenantRow.categories,
    };

    req.log.info({ slug, city: trimmedCity, emailVerification: emailVerificationEnabled }, "New tenant created via onboarding");
    awardXP(tenantRow.id, "tenant_referral", 50, { slug, city: trimmedCity }).catch(() => {});

    if (emailVerificationEnabled) {
      try {
        await sendVerificationEmail(slug, adminEmail.trim().toLowerCase());
        req.log.info({ slug }, "Verification email sent");
      } catch (emailErr) {
        req.log.error({ emailErr, slug }, "Failed to send verification email — tenant created but not yet active");
      }
    }

    res.status(201).json({
      tenant,
      requiresVerification: emailVerificationEnabled,
      url: `https://${slug}.eventcarpooling.com`,
      adminUrl: `https://${slug}.eventcarpooling.com/admin`,
    });
  } catch (err) {
    req.log.error({ err }, "Error creating tenant");
    res.status(500).json({ error: "server_error", message: "Failed to create city" });
  }
});

// Email verification — activate tenant after clicking the link in their email
router.get("/tenants/verify", async (req, res) => {
  const slug = req.query.slug as string | undefined;
  const token = req.query.token as string | undefined;

  if (!slug || !token) {
    res.status(400).send("Missing slug or token.");
    return;
  }

  if (!isEmailVerificationEnabled()) {
    // Verification not configured — redirect to admin anyway
    res.redirect(`https://${slug}.eventcarpooling.com/admin`);
    return;
  }

  const expected = generateVerifyToken(slug);
  if (token !== expected) {
    res.status(400).send("Invalid or expired verification link. Please sign up again.");
    return;
  }

  try {
    const [tenant] = await db
      .select({ id: tenantsTable.id, isActive: tenantsTable.isActive })
      .from(tenantsTable)
      .where(eq(tenantsTable.slug, slug))
      .limit(1);

    if (!tenant) {
      res.status(404).send("City not found.");
      return;
    }

    if (!tenant.isActive) {
      await db
        .update(tenantsTable)
        .set({ isActive: true, emailVerified: true })
        .where(eq(tenantsTable.id, tenant.id));
    }

    // Redirect to the new city's admin page
    res.redirect(`https://${slug}.eventcarpooling.com/admin?verified=1`);
  } catch (err) {
    req.log.error({ err, slug }, "Error verifying tenant email");
    res.status(500).send("Something went wrong. Please try again.");
  }
});

export default router;
