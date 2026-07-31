import { lumaAdapter } from "./luma";
import { meetupAdapter } from "./meetup";
import { eventbriteAdapter } from "./eventbrite";
import { eventbriteWebAdapter } from "./eventbriteWeb";
import { stationAustinAdapter } from "./stationAustin";
import { bandsintownAdapter } from "./bandsintown";
import { songkickAdapter } from "./songkick";
import { canonicalizeCategory } from "./utils";
import type { SourceAdapter } from "./types";

// Keyed by canonical category names only — aliases are resolved via canonicalizeCategory()
export const CATEGORY_SOURCES: Record<string, SourceAdapter[]> = {
  "Tech": [stationAustinAdapter, eventbriteWebAdapter, lumaAdapter, meetupAdapter, eventbriteAdapter],
  "Music": [bandsintownAdapter, songkickAdapter, eventbriteAdapter],
  "Food": [lumaAdapter, eventbriteAdapter, eventbriteWebAdapter],
  "Wellness": [lumaAdapter, meetupAdapter, eventbriteAdapter],
  "Civics": [meetupAdapter, eventbriteAdapter, eventbriteWebAdapter],
  "Arts & Culture": [lumaAdapter, eventbriteAdapter, eventbriteWebAdapter],
  // Aliases used by active tenants
  "Arts": [lumaAdapter, eventbriteAdapter, eventbriteWebAdapter],
  "Sports": [lumaAdapter, meetupAdapter, eventbriteAdapter],
};

export function getAdaptersForCategories(categories: string[]): Array<{ adapter: SourceAdapter; category: string }> {
  const tasks: Array<{ adapter: SourceAdapter; category: string }> = [];
  const seen = new Set<string>();

  for (const rawCategory of categories) {
    const category = canonicalizeCategory(rawCategory);
    const adapters = CATEGORY_SOURCES[category] || [];
    for (const adapter of adapters) {
      const key = `${adapter.name}:${category}`;
      if (!seen.has(key)) {
        seen.add(key);
        tasks.push({ adapter, category });
      }
    }
  }

  return tasks;
}
