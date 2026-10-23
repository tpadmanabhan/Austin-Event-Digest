import { and, eq, sql } from "drizzle-orm";
import { db, digestsTable, tenantsTable, EventItemSchema } from "@workspace/db";
import edition from "./editions/dallas-2026-10-23.json";
import { withPublicEventIds } from "./publicEventIdentity";
import { geocodeAndPatchDigest } from "./geocodeVenue";

/** Seed Dallas's first unsent edition without creating admin access or sending email. */
export async function seedDallas(): Promise<void> {
  const events = EventItemSchema.array().parse(edition.events);
  const seeded = await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('dallas-first-edition'))`);
    await tx.insert(tenantsTable).values({
      slug: "dallas",
      name: "Dallas Events",
      city: "Dallas, TX",
      accentColor: "#B86143",
      categories: ["Tech", "Arts", "Sports", "Civics", "Wellness"],
      digestTitle: "Dallas Events",
      isActive: true,
      emailVerified: false,
    }).onConflictDoNothing();
    const [tenant] = await tx.select({ id: tenantsTable.id }).from(tenantsTable)
      .where(eq(tenantsTable.slug, "dallas")).limit(1);
    if (!tenant) throw new Error("Dallas tenant was not created");
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

  if (seeded) await geocodeAndPatchDigest(seeded.id, seeded.events, "dallas");
}
