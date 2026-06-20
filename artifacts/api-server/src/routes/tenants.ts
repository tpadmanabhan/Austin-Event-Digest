import { Router, type IRouter } from "express";
import { db, tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

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
      .orderBy(tenantsTable.createdAt);

    res.json({ tenants });
  } catch (err) {
    req.log.error({ err }, "Error listing tenants");
    res.status(500).json({ error: "server_error", message: "Failed to list tenants" });
  }
});

export default router;
