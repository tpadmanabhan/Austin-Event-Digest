import {
  db,
  xpLedgerTable,
  earnedBadgesTable,
  weeklyChallengesTable,
  challengeProgressTable,
  streaksTable,
  digestsTable,
  rsvpsTable,
  subscribersTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "./logger";

// ── ISO week helpers ─────────────────────────────────────────────────────────

export function getISOWeekString(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function isConsecutiveWeek(lastWeek: string | null | undefined, currentWeek: string): boolean {
  if (!lastWeek) return false;
  const lastParts = lastWeek.split("-W").map(Number);
  const curParts = currentWeek.split("-W").map(Number);
  if (lastParts.length !== 2 || curParts.length !== 2) return false;
  const [lastYear, lastW] = lastParts;
  const [curYear, curW] = curParts;
  if (isNaN(lastYear) || isNaN(lastW) || isNaN(curYear) || isNaN(curW)) return false;
  if (curYear === lastYear) return curW === lastW + 1;
  if (curYear === lastYear + 1) return lastW >= 52 && curW === 1;
  return false;
}

// ── Badge definitions ────────────────────────────────────────────────────────

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockHint: string;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: "first_digest", name: "First Digest", description: "Published your first weekly digest", icon: "📰", unlockHint: "Publish your first digest" },
  { id: "event_curator", name: "Event Curator", description: "Published a digest with 10+ events", icon: "📅", unlockHint: "Publish a digest with 10 or more events" },
  { id: "carpool_starter", name: "Carpool Starter", description: "Got 5 carpool RSVPs total", icon: "🚗", unlockHint: "Get 5 carpool RSVPs" },
  { id: "carpool_pro", name: "Carpool Pro", description: "Got 25 carpool RSVPs total", icon: "🚘", unlockHint: "Get 25 carpool RSVPs" },
  { id: "carpool_champion", name: "Carpool Champion", description: "Got 100 carpool RSVPs total", icon: "🏆", unlockHint: "Get 100 carpool RSVPs" },
  { id: "community_builder", name: "Community Builder", description: "Reached 25 active subscribers", icon: "👥", unlockHint: "Grow to 25 subscribers" },
  { id: "city_connector", name: "City Connector", description: "Reached 50 active subscribers", icon: "🌆", unlockHint: "Grow to 50 subscribers" },
  { id: "super_connector", name: "Super Connector", description: "Reached 100 active subscribers", icon: "⚡", unlockHint: "Grow to 100 subscribers" },
  { id: "on_a_roll", name: "On a Roll", description: "Maintained a 3-week digest streak", icon: "🔥", unlockHint: "Publish digests 3 weeks in a row" },
  { id: "streak_master", name: "Streak Master", description: "Maintained a 5-week digest streak", icon: "🔥🔥", unlockHint: "Publish digests 5 weeks in a row" },
  { id: "city_recruiter", name: "City Recruiter", description: "Helped recruit a new city to the platform", icon: "🌍", unlockHint: "Refer a new city to join the platform" },
];

// ── Challenge templates ──────────────────────────────────────────────────────

interface ChallengeTemplate {
  key: string;
  title: string;
  description: string;
  targetValue: number;
  xpReward: number;
  reasonFilter: string;
}

const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  { key: "get_5_rsvps", title: "Carpool Rush", description: "Get 5 carpool RSVPs this week", targetValue: 5, xpReward: 50, reasonFilter: "rsvp" },
  { key: "publish_digest", title: "Weekly Editor", description: "Publish a digest this week", targetValue: 1, xpReward: 25, reasonFilter: "digest_event" },
  { key: "gain_3_subscribers", title: "Growing Strong", description: "Gain 3 new subscribers this week", targetValue: 3, xpReward: 30, reasonFilter: "subscriber" },
];

// ── Challenge seeder ─────────────────────────────────────────────────────────

export async function seedWeeklyChallengesIfNeeded(weekOf: string): Promise<void> {
  // Use ON CONFLICT DO NOTHING so concurrent first-requests of a new week
  // don't race to create duplicate rows. The unique constraint on
  // (week_of, challenge_key) ensures exactly one row per template per week.
  for (const t of CHALLENGE_TEMPLATES) {
    await db.insert(weeklyChallengesTable)
      .values({
        weekOf,
        challengeKey: t.key,
        title: t.title,
        description: t.description,
        targetValue: t.targetValue,
        xpReward: t.xpReward,
        reasonFilter: t.reasonFilter,
      })
      .onConflictDoNothing();
  }
}

// ── Challenge progress ───────────────────────────────────────────────────────

async function updateChallengeProgress(tenantId: number, reason: string): Promise<void> {
  const weekOf = getISOWeekString();
  await seedWeeklyChallengesIfNeeded(weekOf);

  const challenges = await db
    .select()
    .from(weeklyChallengesTable)
    .where(and(
      eq(weeklyChallengesTable.weekOf, weekOf),
      eq(weeklyChallengesTable.reasonFilter, reason),
    ));

  for (const challenge of challenges) {
    // Atomic upsert: increment current_value by 1, but only when not yet completed.
    // ON CONFLICT ensures concurrent requests serialise on the unique constraint
    // (tenant_id, challenge_id) and each increments exactly once rather than
    // racing to produce duplicate progress rows or duplicate completion awards.
    // db.execute returns { rows: [...] }, not a plain array.
    const result = await db.execute(sql`
      INSERT INTO challenge_progress (tenant_id, challenge_id, current_value)
      VALUES (${tenantId}, ${challenge.id}, 1)
      ON CONFLICT (tenant_id, challenge_id) DO UPDATE
        SET current_value = challenge_progress.current_value + 1
        WHERE challenge_progress.completed_at IS NULL
      RETURNING id, current_value, completed_at
    `);
    const updated = result.rows[0] as { id: number; current_value: number; completed_at: string | null } | undefined;

    if (!updated) continue; // already completed — DO UPDATE WHERE was skipped, no row returned

    const newValue = Number(updated.current_value);
    const justCompleted = newValue >= challenge.targetValue && updated.completed_at === null;

    if (justCompleted) {
      // Atomic CTE: mark completed AND insert XP in one statement.
      // The INSERT runs only if the UPDATE actually changes completed_at from NULL,
      // so concurrent requests that both reach this branch can't both award XP.
      const metadataJson = JSON.stringify({ challengeKey: challenge.challengeKey, title: challenge.title });
      await db.execute(sql`
        WITH completion AS (
          UPDATE challenge_progress
          SET completed_at = NOW()
          WHERE id = ${updated.id} AND completed_at IS NULL
          RETURNING id
        )
        INSERT INTO xp_ledger (tenant_id, amount, reason, metadata)
        SELECT ${tenantId}, ${challenge.xpReward}, 'challenge_complete', ${metadataJson}::jsonb
        WHERE EXISTS (SELECT 1 FROM completion)
      `);
      logger.info({ tenantId, challengeKey: challenge.challengeKey, xp: challenge.xpReward }, "Challenge completed — XP awarded");
    }
  }
}

// ── Streak updater ───────────────────────────────────────────────────────────

export async function updateStreak(tenantId: number): Promise<void> {
  const currentWeek = getISOWeekString();
  const [streak] = await db
    .select()
    .from(streaksTable)
    .where(eq(streaksTable.tenantId, tenantId))
    .limit(1);

  if (!streak) {
    await db.insert(streaksTable).values({
      tenantId,
      currentStreak: 1,
      longestStreak: 1,
      lastActiveWeek: currentWeek,
    });
    return;
  }

  if (streak.lastActiveWeek === currentWeek) return;

  const consecutive = isConsecutiveWeek(streak.lastActiveWeek, currentWeek);
  const newCurrent = consecutive ? streak.currentStreak + 1 : 1;
  const newLongest = Math.max(newCurrent, streak.longestStreak);

  await db
    .update(streaksTable)
    .set({ currentStreak: newCurrent, longestStreak: newLongest, lastActiveWeek: currentWeek })
    .where(eq(streaksTable.tenantId, tenantId));
}

// ── Badge checker ────────────────────────────────────────────────────────────

async function checkBadgeCondition(tenantId: number, badgeId: string): Promise<boolean> {
  switch (badgeId) {
    case "first_digest": {
      const [r] = await db.select({ c: sql<string>`count(*)` }).from(digestsTable).where(eq(digestsTable.tenantId, tenantId));
      return Number(r?.c ?? 0) >= 1;
    }
    case "event_curator": {
      const digests = await db.select({ events: digestsTable.events }).from(digestsTable).where(eq(digestsTable.tenantId, tenantId));
      return digests.some(d => Array.isArray(d.events) && (d.events as unknown[]).length >= 10);
    }
    case "carpool_starter": {
      const [r] = await db.select({ c: sql<string>`count(*)` }).from(rsvpsTable).where(eq(rsvpsTable.tenantId, tenantId));
      return Number(r?.c ?? 0) >= 5;
    }
    case "carpool_pro": {
      const [r] = await db.select({ c: sql<string>`count(*)` }).from(rsvpsTable).where(eq(rsvpsTable.tenantId, tenantId));
      return Number(r?.c ?? 0) >= 25;
    }
    case "carpool_champion": {
      const [r] = await db.select({ c: sql<string>`count(*)` }).from(rsvpsTable).where(eq(rsvpsTable.tenantId, tenantId));
      return Number(r?.c ?? 0) >= 100;
    }
    case "community_builder": {
      const [r] = await db.select({ c: sql<string>`count(*)` }).from(subscribersTable)
        .where(and(eq(subscribersTable.tenantId, tenantId), eq(subscribersTable.isActive, true)));
      return Number(r?.c ?? 0) >= 25;
    }
    case "city_connector": {
      const [r] = await db.select({ c: sql<string>`count(*)` }).from(subscribersTable)
        .where(and(eq(subscribersTable.tenantId, tenantId), eq(subscribersTable.isActive, true)));
      return Number(r?.c ?? 0) >= 50;
    }
    case "super_connector": {
      const [r] = await db.select({ c: sql<string>`count(*)` }).from(subscribersTable)
        .where(and(eq(subscribersTable.tenantId, tenantId), eq(subscribersTable.isActive, true)));
      return Number(r?.c ?? 0) >= 100;
    }
    case "on_a_roll": {
      const [s] = await db.select().from(streaksTable).where(eq(streaksTable.tenantId, tenantId)).limit(1);
      return Math.max(s?.currentStreak ?? 0, s?.longestStreak ?? 0) >= 3;
    }
    case "streak_master": {
      const [s] = await db.select().from(streaksTable).where(eq(streaksTable.tenantId, tenantId)).limit(1);
      return Math.max(s?.currentStreak ?? 0, s?.longestStreak ?? 0) >= 5;
    }
    case "city_recruiter": {
      const [r] = await db.select({ c: sql<string>`count(*)` }).from(xpLedgerTable)
        .where(and(eq(xpLedgerTable.tenantId, tenantId), eq(xpLedgerTable.reason, "tenant_referral")));
      return Number(r?.c ?? 0) >= 1;
    }
    default:
      return false;
  }
}

async function checkAndAwardBadges(tenantId: number): Promise<void> {
  const alreadyEarned = await db
    .select({ badgeId: earnedBadgesTable.badgeId })
    .from(earnedBadgesTable)
    .where(eq(earnedBadgesTable.tenantId, tenantId));
  const earnedSet = new Set(alreadyEarned.map(b => b.badgeId));

  for (const badge of BADGE_DEFINITIONS) {
    if (earnedSet.has(badge.id)) continue;
    const earned = await checkBadgeCondition(tenantId, badge.id);
    if (earned) {
      try {
        await db.insert(earnedBadgesTable).values({ tenantId, badgeId: badge.id });
        logger.info({ tenantId, badgeId: badge.id }, "Badge earned");
      } catch {
        // unique constraint race — ignore
      }
    }
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Award XP to a tenant for a tracked activity. Fire-and-forget from route handlers.
 *
 * Reasons and XP values:
 *   rsvp             +10  — carpool RSVP submitted
 *   digest_event     +5 per event (pass eventCount * 5 as amount)
 *   subscriber       +3   — new subscriber gained
 *   tenant_referral  +50  — new city launched through referral
 */
export async function awardXP(
  tenantId: number,
  reason: string,
  amount: number,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(xpLedgerTable).values({ tenantId, amount, reason, metadata: metadata ?? null });
  } catch (err) {
    logger.warn({ err, tenantId, reason, amount }, "Failed to insert XP ledger row — non-fatal");
    return;
  }

  // For streak-affecting activities, update streak BEFORE badge evaluation so that
  // streak-based badges (on_a_roll, streak_master) see the fresh streak count.
  if (reason === "rsvp" || reason === "digest_event") {
    await updateStreak(tenantId).catch(err =>
      logger.warn({ err, tenantId, reason }, "Streak update failed — non-fatal"),
    );
  }

  // Run challenge progress and badge checks independently: a failure in one must
  // not prevent the other from running, since both are additive side-effects.
  await updateChallengeProgress(tenantId, reason).catch(err =>
    logger.warn({ err, tenantId, reason }, "Challenge progress update failed — non-fatal"),
  );
  await checkAndAwardBadges(tenantId).catch(err =>
    logger.warn({ err, tenantId }, "Badge check failed — non-fatal"),
  );
}

// ── Query helpers (used by gamification routes) ──────────────────────────────

export async function getTenantTotalXP(tenantId: number): Promise<number> {
  const [r] = await db
    .select({ total: sql<string>`coalesce(sum(amount), 0)` })
    .from(xpLedgerTable)
    .where(eq(xpLedgerTable.tenantId, tenantId));
  return Number(r?.total ?? 0);
}

export interface LeaderboardRow {
  tenantId: number;
  slug: string;
  city: string;
  name: string;
  totalXP: number;
  rank: number;
}

export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const rows = await db.execute(sql`
    SELECT
      t.id AS tenant_id,
      t.slug,
      t.city,
      t.name,
      COALESCE(SUM(x.amount), 0) AS total_xp
    FROM tenants t
    LEFT JOIN xp_ledger x ON x.tenant_id = t.id
    WHERE t.is_active = true
    GROUP BY t.id, t.slug, t.city, t.name
    ORDER BY total_xp DESC, t.created_at ASC
  `);

  return (rows.rows as Array<{ tenant_id: number; slug: string; city: string; name: string; total_xp: string | number }>)
    .map((r, i) => ({
      tenantId: r.tenant_id,
      slug: r.slug,
      city: r.city,
      name: r.name,
      totalXP: Number(r.total_xp),
      rank: i + 1,
    }));
}

export async function getActiveChallengesWithProgress(tenantId: number) {
  const weekOf = getISOWeekString();
  await seedWeeklyChallengesIfNeeded(weekOf);

  const challenges = await db
    .select()
    .from(weeklyChallengesTable)
    .where(eq(weeklyChallengesTable.weekOf, weekOf));

  const progressRows = await db
    .select()
    .from(challengeProgressTable)
    .where(eq(challengeProgressTable.tenantId, tenantId));

  const progressMap = new Map(progressRows.map(p => [p.challengeId, p]));

  return challenges.map(c => {
    const prog = progressMap.get(c.id);
    return {
      id: c.id,
      challengeKey: c.challengeKey,
      title: c.title,
      description: c.description,
      targetValue: c.targetValue,
      xpReward: c.xpReward,
      currentValue: prog?.currentValue ?? 0,
      completedAt: prog?.completedAt ?? null,
    };
  });
}

export async function getBadgesWithEarnedState(tenantId: number) {
  const earned = await db
    .select()
    .from(earnedBadgesTable)
    .where(eq(earnedBadgesTable.tenantId, tenantId));
  const earnedMap = new Map(earned.map(b => [b.badgeId, b.earnedAt]));

  return BADGE_DEFINITIONS.map(def => ({
    ...def,
    earned: earnedMap.has(def.id),
    earnedAt: earnedMap.get(def.id) ?? null,
  }));
}

export async function getOrCreateStreak(tenantId: number) {
  const [streak] = await db
    .select()
    .from(streaksTable)
    .where(eq(streaksTable.tenantId, tenantId))
    .limit(1);

  if (!streak) return { currentStreak: 0, longestStreak: 0, lastActiveWeek: null };

  const currentWeek = getISOWeekString();
  // Streak is still valid if the tenant was active THIS week or LAST week.
  // (Last week = they haven't acted yet this week but haven't broken the chain.)
  // Any gap beyond one week means the streak is broken — report 0 without mutating
  // the DB (the stored value is overwritten the next time updateStreak is called).
  const isStillActive =
    streak.lastActiveWeek === currentWeek ||
    isConsecutiveWeek(streak.lastActiveWeek, currentWeek);

  return {
    currentStreak: isStillActive ? streak.currentStreak : 0,
    longestStreak: streak.longestStreak,
    lastActiveWeek: streak.lastActiveWeek,
  };
}
