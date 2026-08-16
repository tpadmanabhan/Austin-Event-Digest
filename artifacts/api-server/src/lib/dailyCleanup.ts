import { db, digestsTable } from "@workspace/db";
import { eq, isNull, desc } from "drizzle-orm";
import type { EventItem } from "@workspace/db";
import { logger } from "./logger";

const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/**
 * Returns true if the event's date has already passed relative to `today`.
 *
 * Year inference — weekOf-anchored policy:
 *   Yearless date strings (e.g. "Jan 15", "Aug 3") are interpreted in the context
 *   of the digest's `weekOf` date:
 *
 *   1. Construct the event date using weekOf's year.
 *   2. If that date falls before weekOf, the event refers to the following year
 *      (classic case: a December digest listing a January event). Bump one year.
 *   3. Compare the resolved date to `today`.
 *
 *   This is the same anchoring strategy used by autoTagFutureEvents and
 *   carryForwardFeaturedEvents, so year resolution is consistent across the app.
 *
 * Never marks spotlights, community posts, or featured (Special Event) entries
 * as stale — those are protected from automated removal.
 */
export function isStaleEvent(
  ev: Record<string, unknown>,
  today: Date,
  weekOf: Date,
): boolean {
  // Protected entries are never stale
  if (!ev["date"] || ev["isPost"] || ev["isBusinessSpotlight"] || ev["featured"]) return false;

  const dateStr = String(ev["date"]);
  const m = dateStr.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})/i);
  if (!m) return false;

  const cap = m[1].substring(0, 3).charAt(0).toUpperCase() + m[1].substring(1, 3).toLowerCase();
  const month = MONTH_MAP[cap];
  if (month === undefined) return false;

  const eventDate = new Date(weekOf.getFullYear(), month, parseInt(m[2], 10));

  // If the event date falls before weekOf, it must refer to the next year
  // (e.g. "Jan 10" in a December digest → Jan 10 of the following year)
  if (eventDate < weekOf) {
    eventDate.setFullYear(weekOf.getFullYear() + 1);
  }

  return eventDate < today;
}

async function runDailyCleanup(): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // Only process unsent digests (sentAt IS NULL is the authoritative unsent signal)
    const digests = await db
      .select({ id: digestsTable.id, events: digestsTable.events, weekOf: digestsTable.weekOf })
      .from(digestsTable)
      .where(isNull(digestsTable.sentAt));

    let totalRemoved = 0;
    let digestsUpdated = 0;

    for (const digest of digests) {
      const events = digest.events as Record<string, unknown>[];
      if (!Array.isArray(events) || events.length === 0) continue;

      const weekOf = new Date(digest.weekOf);
      weekOf.setHours(0, 0, 0, 0);

      const fresh = events.filter(ev => !isStaleEvent(ev, today, weekOf));

      if (fresh.length < events.length) {
        await db
          .update(digestsTable)
          .set({ events: fresh as unknown as EventItem[] })
          .where(eq(digestsTable.id, digest.id));
        totalRemoved += events.length - fresh.length;
        digestsUpdated++;
      }
    }

    if (totalRemoved > 0) {
      logger.info(
        { totalRemoved, digestsUpdated, digestsChecked: digests.length },
        "Daily cleanup: removed past events from unsent digests",
      );
    }
  } catch (err) {
    logger.warn({ err }, "Daily cleanup job failed (non-fatal)");
  }
}

/**
 * Removes past events from the LATEST digest of every tenant.
 * Unlike runDailyCleanup (which only touches unsent digests), this also
 * processes sent digests so that live city pages stop showing last week's events
 * after the new week begins each Sunday.
 *
 * Spotlights, community posts, and featured (Special Event) entries are always preserved.
 * Exported so the admin API can call it as a manual trigger too.
 */
export async function cleanLatestDigestsAllTenants(): Promise<{ tenantsProcessed: number; totalRemoved: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch all digests ordered newest-first, then take the first one per tenant
  const allDigests = await db
    .select({ id: digestsTable.id, tenantId: digestsTable.tenantId, events: digestsTable.events, weekOf: digestsTable.weekOf })
    .from(digestsTable)
    .orderBy(desc(digestsTable.weekOf), desc(digestsTable.id));

  const seen = new Set<number>();
  const latest: typeof allDigests = [];
  for (const d of allDigests) {
    if (!seen.has(d.tenantId)) {
      seen.add(d.tenantId);
      latest.push(d);
    }
  }

  let totalRemoved = 0;
  let tenantsProcessed = 0;

  for (const digest of latest) {
    const events = digest.events as Record<string, unknown>[];
    if (!Array.isArray(events) || events.length === 0) continue;

    const weekOf = new Date(digest.weekOf);
    weekOf.setHours(0, 0, 0, 0);

    const fresh = events.filter(ev => !isStaleEvent(ev, today, weekOf));

    if (fresh.length < events.length) {
      await db
        .update(digestsTable)
        .set({ events: fresh as unknown as EventItem[] })
        .where(eq(digestsTable.id, digest.id));
      totalRemoved += events.length - fresh.length;
      tenantsProcessed++;
    }
  }

  if (totalRemoved > 0 || latest.length > 0) {
    logger.info(
      { totalRemoved, tenantsProcessed, tenantsChecked: latest.length },
      "Sunday cleanup: removed past events from latest digests",
    );
  }

  return { tenantsProcessed, totalRemoved };
}

/**
 * Schedules the Sunday cleanup to run each Sunday at 4:00 AM.
 * Runs against the latest digest for every tenant (including sent digests),
 * clearing last-week events before the day gets going.
 */
export function scheduleWeeklySundayCleanup(): void {
  function msUntilSunday4am(): number {
    const now = new Date();
    const target = new Date(now);
    // Days until next Sunday (0 = today if today is Sunday)
    const daysUntilSun = (7 - now.getDay()) % 7;
    target.setDate(now.getDate() + daysUntilSun);
    target.setHours(4, 0, 0, 0);
    // If we're already past Sunday 4 AM this week, push to next Sunday
    if (target <= now) target.setDate(target.getDate() + 7);
    return Math.max(target.getTime() - now.getTime(), 60_000);
  }

  function scheduleNext(): void {
    const delay = msUntilSunday4am();
    const nextRun = new Date(Date.now() + delay);
    logger.info({ nextRun: nextRun.toISOString() }, "Sunday digest cleanup scheduled");

    setTimeout(async () => {
      try {
        const result = await cleanLatestDigestsAllTenants();
        logger.info(result, "Sunday digest cleanup complete");
      } catch (err) {
        logger.warn({ err }, "Sunday digest cleanup failed (non-fatal)");
      }
      scheduleNext();
    }, delay);
  }

  scheduleNext();
  logger.info("Sunday digest cleanup scheduler started (runs every Sunday at 4 AM)");
}

export function scheduleDailyCleanup(): void {
  function scheduleNext(): void {
    // Target 2:00 AM server time each day
    const now = new Date();
    const next2am = new Date(now);
    next2am.setHours(2, 0, 0, 0);
    if (next2am <= now) next2am.setDate(next2am.getDate() + 1);
    const delay = Math.max(next2am.getTime() - now.getTime(), 60_000);

    setTimeout(async () => {
      await runDailyCleanup();
      scheduleNext();
    }, delay);
  }

  // Run once immediately on startup (catches anything missed overnight)
  void runDailyCleanup();
  scheduleNext();

  logger.info("Daily stale-event cleanup scheduled (next run: 2 AM)");
}
