import { db, digestsTable, tenantsTable, EventItemSchema } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import edition from "./editions/miami-2026-10-14.json";
import { hashPassword } from "./passwordHash";
import { withPublicEventIds } from "./publicEventIdentity";

/** First edition only. Never replace an edited or sent edition, or add subscribers. */
export async function seedMiami(): Promise<void> {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const passwordHash = configuredPassword && configuredPassword.trim().length >= 12
    ? await hashPassword(configuredPassword) : null;
  await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('miami-first-edition'))`);
    await tx.insert(tenantsTable).values({
      slug: "miami", name: "Miami Events", city: "Miami, FL",
      accentColor: "#E8664A", categories: ["Tech", "Arts", "Sports", "Civics", "Wellness"],
      digestTitle: "Miami Events", isActive: true, emailVerified: false, passwordHash,
      heroImageUrl: "/api/storage/public-objects/cities/miami/hero.jpg",
      brandIconUrl: "/api/storage/public-objects/cities/miami/mark.png",
    }).onConflictDoNothing();
    const [tenant] = await tx.select({ id: tenantsTable.id }).from(tenantsTable)
      .where(eq(tenantsTable.slug, "miami"));
    if (!tenant) throw new Error("Miami tenant was not created");
    const weekOf = new Date(`${edition.weekOf}T12:00:00Z`);
    const [existing] = await tx.select({ id: digestsTable.id }).from(digestsTable)
      .where(and(eq(digestsTable.tenantId, tenant.id), eq(digestsTable.weekOf, weekOf))).limit(1);
    if (existing) return;
    await tx.insert(digestsTable).values({
      tenantId: tenant.id, weekOf, subject: edition.subject, intro: edition.intro,
      events: withPublicEventIds(EventItemSchema.array().parse(edition.events), tenant.id),
      sentCount: 0,
    });
  });
}
