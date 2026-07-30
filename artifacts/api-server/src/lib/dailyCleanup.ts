import { db, digestsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function isStaleEvent(ev: Record<string, unknown>, today: Date): boolean {
  // Never remove spotlights, community posts, or featured (Special Events)
  if (!ev["date"] || ev["isPost"] || ev["isBusinessSpotlight"] || ev["featured"]) return false;
  const dateStr = String(ev["date"]);
  const m = dateStr.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})/i);
  if (!m) return false;
  const cap = m[1].substring(0, 3).charAt(0).toUpperCase() + m[1].substring(1, 3).toLowerCase();
  const month = MONTH_MAP[cap];
  if (month === undefined) return false;
  return new Date(today.getFullYear(), month, parseInt(m[2], 10)) < today;
}

async function runDailyCleanup(): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // Only process unsent digests
    const digests = await db
      .select({ id: digestsTable.id, events: digestsTable.events })
      .from(digestsTable)
      .where(eq(digestsTable.sentCount, 0));

    let totalRemoved = 0;
    let digestsUpdated = 0;

    for (const digest of digests) {
      const events = digest.events as Record<string, unknown>[];
      if (!Array.isArray(events) || events.length === 0) continue;

      const fresh = events.filter(ev => !isStaleEvent(ev, today));
      if (fresh.length < events.length) {
        await db
          .update(digestsTable)
          .set({ events: fresh })
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
