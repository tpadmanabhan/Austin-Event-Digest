import { db, digestsTable, tenantsTable, EventItemSchema } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import edition from "./editions/boston-2026-10-14.json";
import { hashPassword } from "./passwordHash";
import { withPublicEventIds } from "./publicEventIdentity";

/** Add only the first edition. Never replace edited/sent editions or add subscribers. */
export async function seedBoston(): Promise<void> {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const passwordHash = configuredPassword && configuredPassword.trim().length >= 12
    ? await hashPassword(configuredPassword) : null;
  const events = EventItemSchema.array().parse(edition.events);
  await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('boston-first-edition'))`);
    await tx.insert(tenantsTable).values({
      slug: "boston", name: "Boston Events", city: "Boston, MA",
      accentColor: "#BD3039", categories: ["Tech", "Arts", "Sports", "Civics", "Wellness"],
      digestTitle: "Boston Events", isActive: true, emailVerified: false, passwordHash,
      heroImageUrl: "/api/storage/public-objects/cities/boston/hero.jpg",
      brandIconUrl: "/api/storage/public-objects/cities/boston/mark.svg",
    }).onConflictDoNothing();
    const [tenant] = await tx.select({ id: tenantsTable.id }).from(tenantsTable)
      .where(eq(tenantsTable.slug, "boston"));
    if (!tenant) throw new Error("Boston tenant was not created");
    const weekOf = new Date(`${edition.weekOf}T12:00:00Z`);
    const [existing] = await tx.select({ id: digestsTable.id }).from(digestsTable)
      .where(and(eq(digestsTable.tenantId, tenant.id), eq(digestsTable.weekOf, weekOf))).limit(1);
    if (existing) return;
    await tx.insert(digestsTable).values({
      tenantId: tenant.id, weekOf, subject: edition.subject, intro: edition.intro,
      events: withPublicEventIds(events, tenant.id), sentCount: 0,
    });
  });
}
