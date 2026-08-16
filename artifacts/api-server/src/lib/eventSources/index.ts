import type { EventItem } from "@workspace/db";
import type { Tenant } from "@workspace/db";
import { getAdaptersForCategories } from "./registry";
import { deduplicateEvents, filterByTenantCategories } from "./utils";
import { logger } from "../logger";
import { isAdultContent } from "../contentFilter";

export { deduplicateEvents, filterByTenantCategories, canonicalizeCategory } from "./utils";

export interface FetchEventsForTenantOptions {
  tenant: Tenant;
  weekOf: Date;
  weekEnd?: Date;
}

export interface FetchEventsResult {
  events: EventItem[];
  sources: string[];
  attempted: number;
  succeeded: number;
}

export async function fetchEventsForTenant(opts: FetchEventsForTenantOptions): Promise<FetchEventsResult> {
  const { tenant, weekOf, weekEnd } = opts;
  const categories = (tenant.categories as string[]) || [];

  if (categories.length === 0) {
    logger.info({ tenant: tenant.slug }, "No categories configured for tenant — skipping adapters");
    return { events: [], sources: [], attempted: 0, succeeded: 0 };
  }

  const tasks = getAdaptersForCategories(categories);

  const results = await Promise.allSettled(
    tasks.map(({ adapter, category }) =>
      adapter.fetchEvents({ city: tenant.city, category, weekOf, weekEnd })
    )
  );

  const allEvents: EventItem[] = [];
  const successfulSources = new Set<string>();
  let succeeded = 0;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const { adapter, category } = tasks[i];

    if (result.status === "fulfilled") {
      const events = result.value;
      if (events.length > 0) {
        allEvents.push(...events);
        successfulSources.add(adapter.name);
        succeeded++;
      }
      logger.debug(
        { adapter: adapter.name, category, found: events.length },
        "Adapter completed"
      );
    } else {
      logger.warn(
        { adapter: adapter.name, category, err: result.reason },
        "Adapter failed"
      );
    }
  }

  const deduplicated = deduplicateEvents(allEvents);
  const categoryFiltered = filterByTenantCategories(deduplicated, categories);
  // Adult-content safety net — remove any off-brand events that slipped through
  // any adapter (Ticketmaster, Luma, Eventbrite, Meetup, etc.)
  const filtered = categoryFiltered.filter(e => !isAdultContent(e.title, e.description));

  logger.info(
    {
      tenant: tenant.slug,
      categories,
      attempted: tasks.length,
      succeeded,
      raw: allEvents.length,
      deduped: deduplicated.length,
      filtered: filtered.length,
      sources: [...successfulSources],
    },
    "fetchEventsForTenant complete"
  );

  return {
    events: filtered,
    sources: [...successfulSources],
    attempted: tasks.length,
    succeeded,
  };
}
