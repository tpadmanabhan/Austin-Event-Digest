import { Router, type IRouter } from "express";
import { and, desc, eq, gte } from "drizzle-orm";
import { db, digestsTable, tenantsTable, type EventItem } from "@workspace/db";
import { withPublicEventIds } from "../lib/publicEventIdentity";
import { isAdultContent } from "../lib/contentFilter";

const router: IRouter = Router();

router.get("/events/upcoming-across-cities", async (req, res) => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const rows = await db
      .select({
        tenantId: tenantsTable.id,
        slug: tenantsTable.slug,
        name: tenantsTable.name,
        city: tenantsTable.city,
        weekOf: digestsTable.weekOf,
        events: digestsTable.events,
      })
      .from(digestsTable)
      .innerJoin(tenantsTable, eq(digestsTable.tenantId, tenantsTable.id))
      .where(and(eq(tenantsTable.isActive, true), gte(digestsTable.weekOf, cutoff)))
      .orderBy(desc(digestsTable.weekOf), desc(digestsTable.id));

    const digestCountByTenant = new Map<number, number>();
    const seenEvents = new Set<string>();
    const events: Array<{
      id: string;
      citySlug: string;
      cityName: string;
      title: string;
      date: string;
      startDate?: string;
      timezone?: string;
      weekOf: string;
      interestUrl: string;
    }> = [];

    for (const row of rows) {
      // Leadership Austin has its own alumni event feed and should not appear
      // as an unrelated city's cross-city content.
      if (row.slug === "leadershipaustin") continue;

      const digestCount = digestCountByTenant.get(row.tenantId) ?? 0;
      if (digestCount >= 1) continue;
      digestCountByTenant.set(row.tenantId, digestCount + 1);

      const identifiedEvents = withPublicEventIds((row.events as EventItem[]) || [], row.tenantId);
      for (const event of identifiedEvents) {
        if (event.isPost || event.isBusinessSpotlight || !event.title?.trim()
          || isAdultContent(event.title, event.description || "")) continue;
        const id = event.eventId;
        if (!id) continue;

        const identity = `${row.slug}:${id}`;
        if (seenEvents.has(identity)) continue;
        seenEvents.add(identity);

        events.push({
          id,
          citySlug: row.slug,
          cityName: row.city || row.name,
          title: event.title,
          date: event.date,
          ...(event.startDate ? { startDate: event.startDate } : {}),
          ...(event.timezone ? { timezone: event.timezone } : {}),
          weekOf: row.weekOf.toISOString(),
          interestUrl: `https://${row.slug}.irl.group/#event-${id}`,
        });
      }
    }

    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    res.json({ events });
  } catch (err) {
    req.log.error({ err }, "Error fetching upcoming events across cities");
    res.status(500).json({ error: "server_error", message: "Could not load the cross-city event feed" });
  }
});

export default router;
