import { and, eq, sql } from "drizzle-orm";
import { db, digestsTable, tenantsTable, EventItemSchema } from "@workspace/db";
import edition from "./editions/leadershipaustin-2026-11-08.json";
import { hashPassword } from "./passwordHash";
import { withPublicEventIds } from "./publicEventIdentity";
import { DEFAULT_LEADERSHIP_CLASS_PROFILES } from "../../../../shared/leadership-class-profiles";

/** Add only the requested first edition; never replace edited or sent data. */
export async function seedLeadershipAustin(): Promise<void> {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const passwordHash = configuredPassword && configuredPassword.trim().length >= 12
    ? await hashPassword(configuredPassword)
    : null;
  const events = EventItemSchema.array().parse(edition.events);

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('leadershipaustin-first-edition'))`);
    await tx.insert(tenantsTable).values({
      slug: "leadershipaustin",
      name: "Leadership Austin",
      city: "Austin, TX",
      accentColor: "#314363",
      categories: ["Arts", "Sports", "Tech", "Civics", "Wellness", "Education"],
      leadershipClassProfiles: DEFAULT_LEADERSHIP_CLASS_PROFILES,
      digestTitle: "Leadership Austin",
      adminEmail: "aiimplementationclubaustin@gmail.com",
      passwordHash,
      emailVerified: true,
      isActive: true,
    }).onConflictDoNothing();

    const [tenant] = await tx.select({ id: tenantsTable.id }).from(tenantsTable)
      .where(eq(tenantsTable.slug, "leadershipaustin"));
    if (!tenant) throw new Error("Leadership Austin tenant was not created");

    const weekOf = new Date(`${edition.weekOf}T12:00:00Z`);
    const [existing] = await tx.select({ id: digestsTable.id })
      .from(digestsTable)
      .where(and(eq(digestsTable.tenantId, tenant.id), eq(digestsTable.weekOf, weekOf)))
      .limit(1);
    if (existing) return;

    await tx.insert(digestsTable).values({
      tenantId: tenant.id,
      weekOf,
      subject: edition.subject,
      intro: edition.intro,
      events: withPublicEventIds(events, tenant.id),
      sentCount: 0,
    });
  });
}
