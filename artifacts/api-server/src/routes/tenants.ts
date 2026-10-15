import { Router, type IRouter } from "express";
import { createHmac } from "crypto";
import { db, tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requirePlatformRoot } from "../middleware/resolveTenant";

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
        digestTitle: tenantsTable.digestTitle,
        curatorName: tenantsTable.curatorName,
        firstRun: tenantsTable.firstRun,
        adminEmail: tenantsTable.adminEmail,
        heroImageUrl: tenantsTable.heroImageUrl,
        brandIconUrl: tenantsTable.brandIconUrl,
      })
      .from(tenantsTable)
      .where(eq(tenantsTable.slug, slug))
      .limit(1);

    if (!tenant) {
      res.status(404).json({ error: "not_found", message: `No tenant found for slug "${slug}"` });
      return;
    }

    const { adminEmail: _adminEmail, heroImageUrl: _hero, brandIconUrl: _icon, ...publicTenant } = tenant;
    res.json({
      tenant: {
        ...publicTenant,
        hasEmailAdmin: !!_adminEmail,
        hasHeroImage: !!_hero,
        hasBrandIcon: !!_icon,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching tenant config");
    res.status(500).json({ error: "server_error", message: "Failed to fetch tenant config" });
  }
});

// Serve hero or brand icon image for a tenant — public, aggressively cached
router.get("/tenant/image/:type", async (req, res) => {
  const slug = req.query.slug as string | undefined;
  const type = req.params.type as string;
  if (!slug || (type !== "hero" && type !== "icon")) {
    res.status(400).json({ error: "invalid_request", message: "slug and type (hero|icon) are required" });
    return;
  }
  try {
    const [tenant] = await db
      .select({ heroImageUrl: tenantsTable.heroImageUrl, brandIconUrl: tenantsTable.brandIconUrl })
      .from(tenantsTable)
      .where(eq(tenantsTable.slug, slug))
      .limit(1);

    const dataUrl = type === "hero" ? tenant?.heroImageUrl : tenant?.brandIconUrl;
    if (!dataUrl) { res.status(404).end(); return; }

    // Parse "data:<mime>;base64,<data>" format
    const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
    if (!m) { res.status(422).end(); return; }

    const mimeType = m[1];
    const buf = Buffer.from(m[2], "base64");

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=3600");
    res.setHeader("Content-Length", buf.length);
    res.end(buf);
  } catch (err) {
    req.log.error({ err }, "Error serving tenant image");
    res.status(500).end();
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

// Public city creation is retired, including for authenticated city admins.
// Requests must be reviewed before a city is provisioned through operator tooling.
// Do not redirect POST bodies: legacy payloads can contain passwords.
router.post("/tenants", requirePlatformRoot, (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(410).json({
    error: "city_creation_disabled",
    message: "Automatic city creation is no longer available. Submit your city name and email to /api/city-requests for manual review.",
  });
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
