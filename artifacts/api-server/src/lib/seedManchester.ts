import { and, eq, sql } from "drizzle-orm";
import { db, digestsTable, tenantsTable, EventItemSchema } from "@workspace/db";
import edition from "./editions/manchester-2026-10-22.json";
import { withPublicEventIds } from "./publicEventIdentity";
import { geocodeAndPatchDigest } from "./geocodeVenue";

/** Seed Manchester's first public edition without assigning an admin or sending email. */
export async function seedManchester(): Promise<void> {
  const events = EventItemSchema.array().parse(edition.events);
  const seeded = await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('manchester-first-edition'))`);
    await tx.insert(tenantsTable).values({
      slug: "manchester",
      name: "Manchester Events",
      city: "Manchester, England",
      accentColor: "#A64B32",
      categories: ["Arts", "Sports", "Tech", "Civics", "Wellness"],
      digestTitle: "Manchester Events",
      isActive: true,
      emailVerified: true,
    }).onConflictDoNothing();
    const [tenant] = await tx.select({ id: tenantsTable.id }).from(tenantsTable)
      .where(eq(tenantsTable.slug, "manchester")).limit(1);
    if (!tenant) throw new Error("Manchester tenant was not created");
    const weekOf = new Date(`${edition.weekOf}T12:00:00Z`);
    const [existing] = await tx.select({ id: digestsTable.id, events: digestsTable.events })
      .from(digestsTable)
      .where(and(eq(digestsTable.tenantId, tenant.id), eq(digestsTable.weekOf, weekOf)))
      .limit(1);
    if (existing) return existing;
    const [created] = await tx.insert(digestsTable).values({
      tenantId: tenant.id,
      weekOf,
      subject: edition.subject,
      intro: edition.intro,
      events: withPublicEventIds(events, tenant.id),
      sentCount: 0,
    }).returning({ id: digestsTable.id, events: digestsTable.events });
    return created;
  });

  if (seeded) void geocodeAndPatchDigest(seeded.id, seeded.events, "manchester");
}
