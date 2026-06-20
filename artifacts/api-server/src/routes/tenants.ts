import { Router, type IRouter } from "express";
import { db, tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "../lib/passwordHash";

const router: IRouter = Router();

const RESERVED_SLUGS = new Set([
  "www", "api", "app", "admin", "platform", "mail", "smtp", "ftp",
  "help", "support", "status", "blog", "about", "terms", "privacy",
  "auth", "login", "logout", "signup", "dashboard",
]);

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && slug.length >= 2 && slug.length <= 30;
}

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

router.get("/tenants/check-slug", async (req, res) => {
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

router.post("/tenants", async (req, res) => {
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

    const [tenant] = await db
      .insert(tenantsTable)
      .values({
        slug,
        name: tenantName,
        city: trimmedCity,
        accentColor: color,
        categories,
        passwordHash,
        adminEmail: adminEmail.trim().toLowerCase(),
        firstRun: true,
        isActive: true,
      })
      .returning({
        slug: tenantsTable.slug,
        name: tenantsTable.name,
        city: tenantsTable.city,
        accentColor: tenantsTable.accentColor,
        categories: tenantsTable.categories,
      });

    req.log.info({ slug, city: trimmedCity }, "New tenant created via onboarding");

    res.status(201).json({
      tenant,
      url: `https://${slug}.eventcarpooling.com`,
      adminUrl: `https://${slug}.eventcarpooling.com/admin`,
    });
  } catch (err) {
    req.log.error({ err }, "Error creating tenant");
    res.status(500).json({ error: "server_error", message: "Failed to create city" });
  }
});

export default router;
