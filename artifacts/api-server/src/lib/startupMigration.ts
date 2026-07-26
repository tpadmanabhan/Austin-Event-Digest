import { db, digestsTable, subscribersTable, rsvpsTable, tenantsTable } from "@workspace/db";
import { eq, inArray, sql, isNull } from "drizzle-orm";
import { logger } from "./logger";
import { hashPassword } from "./passwordHash";

const MARCH_29_EVENTS = [
  {
    title: "Austin OpenClaw Hackathon",
    date: "Saturday, Apr 4 at 10:00 AM",
    venue: "Mort Subite European Bar",
    category: "Tech & Business",
    link: null,
    imageUrl: null,
    description: "Austin's open-source hardware hackathon returns. Build something wild, meet brilliant makers, and compete for prizes. All skill levels welcome.",
  },
  {
    title: "Barton Springs Sunday Swim",
    date: "Sunday, Mar 29 at 8:00 AM",
    venue: "Barton Springs Pool, Zilker Park",
    category: "Outdoors",
    link: null,
    imageUrl: null,
    description: "Kick off the week with a swim in Austin's legendary spring-fed pool. 68°F year-round, free before 8 AM. The best way to start a Sunday.",
  },
  {
    title: "South Congress Farmers Market",
    date: "Sunday, Mar 29 at 9:00 AM",
    venue: "South Congress Ave, Austin, TX",
    category: "Food & Markets",
    link: null,
    imageUrl: null,
    description: "Local produce, artisan goods, breakfast tacos, and live music. One of Austin's favorite Sunday traditions.",
  },
  {
    title: "Mueller Neighborhood Market",
    date: "Sunday, Mar 29 at 10:00 AM",
    venue: "Mueller Lake Park, 4550 Mueller Blvd",
    category: "Food & Markets",
    link: null,
    imageUrl: null,
    description: "Austin's beloved weekly market with local vendors, fresh food, and a great community vibe. Dogs welcome.",
  },
  {
    title: "Alamo Drafthouse: Weird Wednesday",
    date: "Wednesday, Apr 1 at 10:00 PM",
    venue: "Alamo Drafthouse South Lamar, 1120 S Lamar Blvd",
    category: "Arts & Culture",
    link: null,
    imageUrl: null,
    description: "Austin's cult midnight movie series. Deep cuts, strange cinema, food and drinks at your seat. This week's pick is a surprise — just show up.",
  },
];

const MARCH_22_EVENTS = [
  {
    title: "AITX Monthly Meetup",
    date: "Tuesday, Mar 24 at 5:30 PM",
    venue: "Antler VC",
    category: "Tech & Business",
    link: null,
    imageUrl: null,
    description: "AITX Monthly Meetup at Antler VC — Austin's premier gathering for AI practitioners, founders, and enthusiasts.",
  },
  {
    title: "Japanese–English Language Exchange (ペラペラ Night)",
    date: "Tuesday, Mar 24 at 6:00 PM",
    venue: "Uroko",
    category: "Cultural",
    link: null,
    imageUrl: null,
    description: "A friendly bilingual meetup for Japanese and English speakers to practice conversation over drinks. All levels welcome.",
  },
  {
    title: "Table Network",
    date: "Thursday, Mar 26 at 11:00 AM",
    venue: "Austin Disaster Relief Network",
    category: "Community",
    link: null,
    imageUrl: null,
    description: "A community lunch networking event connecting Austin professionals with local nonprofits. Great food, great people.",
  },
  {
    title: "Chainmail Keychain Workshop at Tiny Minotaur",
    date: "Wednesday, Mar 26 at 8:00 PM",
    venue: "Tiny Minotaur Tavern",
    category: "Arts & Culture",
    link: null,
    imageUrl: null,
    description: "Learn to weave actual chainmail into a custom keychain with StudioKollisions. Beginner-friendly, sold out last time — grab a spot early.",
  },
  {
    title: "Surprising a Struggling Restaurant With 100+ Customers",
    date: "Saturday, Mar 28 at 4:00 PM",
    venue: "2118 S Congress Ave",
    category: "Food & Drink",
    link: null,
    imageUrl: null,
    description: "Austin's feel-good flash mob event returns. Show up, eat well, and make a local restaurant owner's day.",
  },
];

const MARCH_15_EVENTS = [
  {
    title: "SXSW Interactive: Future of AI Panel",
    date: "Monday, Mar 16 at 2:00 PM",
    venue: "Austin Convention Center, 500 E Cesar Chavez St",
    category: "Tech & Business",
    link: null,
    imageUrl: null,
    description: "Top voices in AI discuss the near future of machine intelligence, creative tools, and what it means for how we work and create.",
  },
  {
    title: "Rainey Street Block Party",
    date: "Saturday, Mar 21 at 4:00 PM",
    venue: "Rainey Street, Austin, TX",
    category: "Music",
    link: null,
    imageUrl: null,
    description: "Austin's liveliest bar district closes its street to cars for a massive outdoor party. Multiple stages, food trucks, and the full Rainey Street experience.",
  },
  {
    title: "Austin Nature & Science Center Family Day",
    date: "Sunday, Mar 15 at 10:00 AM",
    venue: "Austin Nature & Science Center, 2389 Stratford Dr",
    category: "Family",
    link: null,
    imageUrl: null,
    description: "Free family programming with live animals, hands-on science exhibits, and guided nature walks. Perfect for all ages.",
  },
  {
    title: "6th Street Live Music Crawl",
    date: "Friday, Mar 20 at 8:00 PM",
    venue: "East 6th Street, Austin, TX",
    category: "Music",
    link: null,
    imageUrl: null,
    description: "A self-guided tour of Austin's legendary live music strip. Multiple venues, multiple genres — blues, country, rock, jazz — all free to wander.",
  },
];

const MARCH_8_EVENTS = [
  {
    title: "Me Mer Mo Monday — CAST Edition",
    date: "Monday, March 23 at 7:00 PM",
    venue: "dadaLab",
    category: "Music",
    link: null,
    imageUrl: null,
    description: "Austin's longest-running experimental music series gets hijacked by the CAST crew for an evening of boundary-demolishing sound, electronic performance, and live visual art.",
  },
  {
    title: "Silent Film Screening with Live Score — The Cabinet of Dr. Caligari",
    date: "Monday, March 23 at 6:00 PM",
    venue: "Austin Public Library",
    category: "Arts & Culture",
    link: null,
    imageUrl: null,
    description: "One of the most influential horror films ever made, performed live in 2026. David DiDonato plays his original score to the 1920 expressionist classic. Free and haunting.",
  },
  {
    title: "Blanton Museum: Texas Contemporary Art Opening",
    date: "Thursday, Mar 12 at 6:00 PM",
    venue: "Blanton Museum of Art, 200 E Martin Luther King Jr Blvd",
    category: "Arts & Culture",
    link: null,
    imageUrl: null,
    description: "Opening reception for a new exhibition showcasing the best of contemporary Texas art. Free for UT students, $12 general admission.",
  },
  {
    title: "Hope Outdoor Gallery Community Paint Day",
    date: "Sunday, Mar 8 at 12:00 PM",
    venue: "Hope Outdoor Gallery, 7901 N Lamar Blvd",
    category: "Arts & Culture",
    link: null,
    imageUrl: null,
    description: "Austin's beloved outdoor street art gallery opens its walls to the public. Bring your own paint or pick some up on-site. All skill levels welcome.",
  },
  {
    title: "Austin Food & Wine Festival Kickoff",
    date: "Friday, Mar 13 at 5:00 PM",
    venue: "Republic Square, 422 W 2nd St",
    category: "Food & Drink",
    link: null,
    imageUrl: null,
    description: "The beloved annual food festival opens with a free outdoor kickoff event featuring local chefs, live music, and plenty of Texas bites.",
  },
];

const APRIL_5_EVENTS = [
  {
    title: "Barton Springs Sunday Swim",
    date: "Sunday, Apr 5 at 8:00 AM",
    venue: "Barton Springs Pool, Zilker Park",
    category: "Outdoors",
    link: null,
    imageUrl: null,
    description: "Kick off the week with a swim in Austin's legendary spring-fed pool. 68°F year-round, free before 8 AM. The best way to start a Sunday.",
  },
  {
    title: "Mueller Farmers Market",
    date: "Sunday, Apr 5 at 10:00 AM",
    venue: "Mueller Lake Park, 4550 Mueller Blvd",
    category: "Food & Markets",
    link: null,
    imageUrl: null,
    description: "One of Austin's most beloved weekly markets. Local produce, artisan foods, live music, and the best breakfast tacos you'll find anywhere.",
  },
  {
    title: "Alamo Drafthouse: Weird Wednesday",
    date: "Wednesday, Apr 8 at 10:00 PM",
    venue: "Alamo Drafthouse South Lamar, 1120 S Lamar Blvd",
    category: "Arts & Culture",
    link: null,
    imageUrl: null,
    description: "Austin's cult midnight movie series. Deep cuts, strange cinema, food and drinks at your seat. This week's pick is a surprise — just show up.",
  },
  {
    title: "East Austin Studio Tour Preview Night",
    date: "Friday, Apr 10 at 6:00 PM",
    venue: "Various East Austin Locations",
    category: "Arts & Culture",
    link: null,
    imageUrl: null,
    description: "Get a first look at EAST (East Austin Studio Tour) with over 200 artists opening their studios. Free, family-friendly, and one of Austin's coolest traditions.",
  },
];

const WEEKS_TO_SEED = [
  {
    weekOf: new Date("2026-04-05T00:00:00.000Z"),
    subject: "🤠 Raj's Austin Events — Week of April 5–April 11, 2026",
    intro: `Happy Sunday, Austin! Here's your curated guide to the best events happening around the city the week of April 5–April 11, 2026.\n\nSpring is in full bloom and Austin is buzzing. From the OpenClaw Hackathon to studio tours, morning swims and late-night cinema — here's everything worth getting off your couch for this week. Get out there and enjoy it! 🤠`,
    events: APRIL_5_EVENTS,
  },
  {
    weekOf: new Date("2026-03-29T00:00:00.000Z"),
    subject: "🤠 Raj's Austin Events — Week of March 29–April 4, 2026",
    intro: `Happy Sunday, Austin! Here's your curated guide to the best events happening around the city the week of March 29–April 4, 2026.\n\nSpring is in full swing and Austin is buzzing. From rooftop markets to hackathons, late-night cinema to morning swims — here's everything worth getting off your couch for this week. Get out there and enjoy it! 🤠`,
    events: MARCH_29_EVENTS,
  },
  {
    weekOf: new Date("2026-03-22T00:00:00.000Z"),
    subject: "🤠 Raj's Austin Events — Week of March 22–28, 2026",
    intro: `Happy Sunday, Austin! Here's your weekly roundup of the best events the week of March 22–28, 2026.\n\nI went through 13 newsletters in my inbox this week and hand-picked the best events happening around the city. From tech meetups to cultural exchanges to feel-good community moments — Austin delivered as always. Get out there! 🤠`,
    events: MARCH_22_EVENTS,
  },
  {
    weekOf: new Date("2026-03-15T00:00:00.000Z"),
    subject: "🤠 Raj's Austin Events — Week of March 15–21, 2026",
    intro: `Happy Sunday, Austin! Your digest for the week of March 15–21, 2026 is here.\n\nWith SXSW in the air, the whole city was electric this week. Even beyond the badge holders, Austin had something for everyone — from free outdoor concerts to art installations and incredible food. This is why we live here.`,
    events: MARCH_15_EVENTS,
  },
  {
    weekOf: new Date("2026-03-08T00:00:00.000Z"),
    subject: "🤠 Raj's Austin Events — Week of March 8–14, 2026",
    intro: `Happy Sunday, Austin! Here's your curated events digest for the week of March 8–14, 2026.\n\nSpring is arriving in Austin and the city is bursting with energy. The warm weather brought everyone outdoors, and local venues were packed with incredible performances and experiences. Here's what was happening around town.`,
    events: MARCH_8_EVENTS,
  },
];

/**
 * Phase 1 — tenant data migration.
 *
 * Safe upgrade path for databases that pre-date the multi-tenant schema:
 *   1. Add nullable tenant_id columns to all three tables (IF NOT EXISTS — idempotent).
 *   2. Seed the Austin tenant row (id=1) if it doesn't exist.
 *   3. Back-fill all null tenant_id values to 1.
 *   4. Enforce NOT NULL on tenant_id now that every row has a value.
 *
 * For fresh databases (created after drizzle-kit push with the new schema) all
 * these steps are no-ops — the IF NOT EXISTS / ON CONFLICT guards make this safe
 * to run on every startup.
 */
async function runTenantMigration(): Promise<void> {
  // Step 1: add is_active to tenants table (may already exist)
  await db.execute(sql`
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true
  `);

  // Step 1b: add adminEmail, emailVerified, and firstRun columns (Tasks #19/#23)
  await db.execute(sql`
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS admin_email TEXT
  `);
  await db.execute(sql`
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false
  `);
  await db.execute(sql`
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS first_run BOOLEAN NOT NULL DEFAULT false
  `);

  // Step 2: add nullable tenant_id FK columns to each table (idempotent)
  await db.execute(sql`
    ALTER TABLE subscribers
      ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id)
  `);
  await db.execute(sql`
    ALTER TABLE digests
      ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id)
  `);
  await db.execute(sql`
    ALTER TABLE rsvps
      ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id)
  `);

  // Step 3: seed the Austin tenant (id=1) if it doesn't exist yet
  await db.execute(sql`
    INSERT INTO tenants (id, slug, name, city, accent_color, categories, is_active)
    VALUES (
      1,
      'austin',
      'Raj''s Austin Events',
      'Austin, TX',
      '#7c3aed',
      '["Tech","Music","Food","Wellness","Civics"]'::jsonb,
      true
    )
    ON CONFLICT (id) DO NOTHING
  `);

  // Step 3b: mark Austin tenant as email-verified (pre-dates verification feature)
  await db.execute(sql`UPDATE tenants SET email_verified = true WHERE slug = 'austin'`);

  // Step 4: back-fill any rows that still have NULL tenant_id
  await db.execute(sql`UPDATE subscribers SET tenant_id = 1 WHERE tenant_id IS NULL`);
  await db.execute(sql`UPDATE digests    SET tenant_id = 1 WHERE tenant_id IS NULL`);
  await db.execute(sql`UPDATE rsvps      SET tenant_id = 1 WHERE tenant_id IS NULL`);

  // Step 5: enforce NOT NULL now that every row has a value
  await db.execute(sql`ALTER TABLE subscribers ALTER COLUMN tenant_id SET NOT NULL`);
  await db.execute(sql`ALTER TABLE digests    ALTER COLUMN tenant_id SET NOT NULL`);
  await db.execute(sql`ALTER TABLE rsvps      ALTER COLUMN tenant_id SET NOT NULL`);

  // Step 6: add composite unique constraints (DROP + re-add to make idempotent)
  await db.execute(sql`
    ALTER TABLE subscribers
      DROP CONSTRAINT IF EXISTS subscribers_email_key,
      DROP CONSTRAINT IF EXISTS subscribers_email_unique,
      DROP CONSTRAINT IF EXISTS subscribers_tenant_email
  `);
  await db.execute(sql`
    ALTER TABLE subscribers
      ADD CONSTRAINT subscribers_tenant_email UNIQUE (tenant_id, email)
  `);

  await db.execute(sql`
    ALTER TABLE rsvps DROP CONSTRAINT IF EXISTS rsvp_unique
  `);
  await db.execute(sql`
    ALTER TABLE rsvps
      ADD CONSTRAINT rsvp_unique UNIQUE (tenant_id, digest_id, event_title, email)
  `);

  logger.info("Tenant migration complete (Austin tenant seeded, all rows scoped to tenant 1)");
}

async function migrateAustinAdminPassword(): Promise<void> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    logger.debug("ADMIN_PASSWORD not set — skipping admin password migration");
    return;
  }

  const [austin] = await db
    .select({ id: tenantsTable.id, passwordHash: tenantsTable.passwordHash })
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, "austin"))
    .limit(1);

  if (!austin) {
    logger.warn("Austin tenant not found — skipping admin password migration");
    return;
  }

  const hashed = await hashPassword(adminPassword);
  await db.execute(
    sql`UPDATE tenants SET password_hash = ${hashed} WHERE slug = 'austin'`
  );

  logger.info("Synced ADMIN_PASSWORD → Austin tenant passwordHash");
}

async function runAdminOtpMigration(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS admin_otps (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id),
      otp_hash TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  // Enforce single active OTP per tenant (idempotent)
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS admin_otps_tenant_id_unique ON admin_otps (tenant_id)
  `);
  logger.info("admin_otps table ready");
}

async function runGamificationMigration(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS xp_ledger (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id),
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      metadata JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS earned_badges (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id),
      badge_id TEXT NOT NULL,
      earned_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT earned_badges_tenant_badge UNIQUE (tenant_id, badge_id)
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS weekly_challenges (
      id SERIAL PRIMARY KEY,
      week_of TEXT NOT NULL,
      challenge_key TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      target_value INTEGER NOT NULL,
      xp_reward INTEGER NOT NULL,
      reason_filter TEXT NOT NULL,
      CONSTRAINT weekly_challenges_week_key UNIQUE (week_of, challenge_key)
    )
  `);
  // Backfill unique constraint onto tables created before this constraint was added
  await db.execute(sql`
    DO $do$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'weekly_challenges_week_key'
      ) THEN
        ALTER TABLE weekly_challenges ADD CONSTRAINT weekly_challenges_week_key UNIQUE (week_of, challenge_key);
      END IF;
    END $do$
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS challenge_progress (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id),
      challenge_id INTEGER NOT NULL REFERENCES weekly_challenges(id),
      current_value INTEGER NOT NULL DEFAULT 0,
      completed_at TIMESTAMP,
      CONSTRAINT challenge_progress_tenant_challenge UNIQUE (tenant_id, challenge_id)
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS streaks (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL UNIQUE REFERENCES tenants(id),
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      last_active_week TEXT
    )
  `);
  logger.info("Gamification migration complete");
}

export async function runStartupMigration(): Promise<void> {
  try {
    await runTenantMigration();
  } catch (err) {
    logger.warn({ err }, "Tenant migration failed (non-fatal) — DB may already be up-to-date");
  }

  try {
    await runAdminOtpMigration();
  } catch (err) {
    logger.warn({ err }, "Admin OTP migration failed (non-fatal) — table may already exist");
  }

  try {
    await runGamificationMigration();
  } catch (err) {
    logger.warn({ err }, "Gamification migration failed (non-fatal) — tables may already exist");
  }

  try {
    await migrateAustinAdminPassword();
  } catch (err) {
    logger.error({ err }, "Admin password migration FAILED — password may not be updated");
  }

  try {
    await db.execute(
      sql`UPDATE tenants SET admin_email = 'aiimplementationclubaustin@gmail.com' WHERE slug = 'austin' AND (admin_email IS NULL OR admin_email != 'aiimplementationclubaustin@gmail.com')`
    );
    logger.info("Austin admin email set to aiimplementationclubaustin@gmail.com");
  } catch (err) {
    logger.warn({ err }, "Austin admin email migration failed (non-fatal)");
  }

  // Brushy Creek is managed by Rohan (migrated from austincares)
  try {
    await db.execute(
      sql`UPDATE tenants SET admin_email = 'rohanvivier@gmail.com', is_active = true, email_verified = true WHERE slug = 'brushycreek'`
    );
    logger.info("Brushy Creek admin email set to rohanvivier@gmail.com");
  } catch (err) {
    logger.warn({ err }, "Brushy Creek admin email migration failed (non-fatal)");
  }

  for (const slug of ["portland", "sacramento"]) {
    try {
      await db.execute(
        sql`UPDATE tenants SET admin_email = 'aiimplementationclubaustin@gmail.com', is_active = true, email_verified = true WHERE slug = ${slug} AND (admin_email IS NULL OR admin_email != 'aiimplementationclubaustin@gmail.com')`
      );
      logger.info({ slug }, "Admin email ensured for managed city tenant");
    } catch (err) {
      logger.warn({ err, slug }, "Managed city admin email migration failed (non-fatal)");
    }
  }

  // Enforce canonical 5-category scheme across all tenants
  try {
    await db.execute(sql`
      UPDATE tenants
      SET categories = '["Arts","Sports","Tech","Civics","Wellness"]'::jsonb
      WHERE categories::text != '["Arts","Sports","Tech","Civics","Wellness"]'
    `);
    logger.info("Canonical categories enforced on all tenants");
  } catch (err) {
    logger.warn({ err }, "Category migration failed (non-fatal)");
  }

  // Migrate austincares subscribers → brushycreek (idempotent)
  try {
    await db.execute(sql`
      UPDATE subscribers s
      SET tenant_id = (SELECT id FROM tenants WHERE slug = 'brushycreek')
      WHERE s.tenant_id = (SELECT id FROM tenants WHERE slug = 'austincares')
        AND NOT EXISTS (
          SELECT 1 FROM subscribers s2
          WHERE s2.tenant_id = (SELECT id FROM tenants WHERE slug = 'brushycreek')
            AND s2.email = s.email
        )
    `);
    logger.info("Migrated austincares subscribers to brushycreek");
  } catch (err) {
    logger.warn({ err }, "Austincares → brushycreek subscriber migration failed (non-fatal)");
  }

  try {
    // De-duplicate every week: keep the digest with the most events (highest event count),
    // breaking ties by lowest id. Delete all others.
    const allDigests = await db
      .select()
      .from(digestsTable);

    // Group by weekOf timestamp
    const byWeek = new Map<number, typeof allDigests>();
    for (const d of allDigests) {
      const key = new Date(d.weekOf).getTime();
      if (!byWeek.has(key)) byWeek.set(key, []);
      byWeek.get(key)!.push(d);
    }

    for (const [, group] of byWeek) {
      if (group.length <= 1) continue;

      // Sort: most events first, lowest id as tiebreaker — keep index 0
      group.sort((a, b) => {
        const aLen = Array.isArray(a.events) ? (a.events as any[]).length : 0;
        const bLen = Array.isArray(b.events) ? (b.events as any[]).length : 0;
        if (bLen !== aLen) return bLen - aLen;
        return a.id - b.id;
      });

      const remove = group.slice(1).map(d => d.id);
      await db.delete(digestsTable).where(inArray(digestsTable.id, remove));
      logger.info({ weekOf: new Date(group[0].weekOf).toISOString(), kept: group[0].id, removed: remove }, "Migration: removed duplicate digests");
    }

    // Seed any weeks that are missing entirely
    for (const week of WEEKS_TO_SEED) {
      const existing = await db
        .select({ id: digestsTable.id })
        .from(digestsTable)
        .where(eq(digestsTable.weekOf, week.weekOf));

      if (existing.length === 0) {
        await db.insert(digestsTable).values({
          tenantId: 1,
          weekOf: week.weekOf,
          subject: week.subject,
          intro: week.intro,
          events: week.events,
          sentCount: 0,
        });
        logger.info({ weekOf: week.weekOf.toISOString() }, "Migration: seeded missing digest");
      }
    }
  } catch (err) {
    logger.warn({ err }, "Startup migration failed (non-fatal)");
  }
}
