import { lumaAdapter } from "./luma";
import { meetupAdapter } from "./meetup";
import { eventbriteAdapter } from "./eventbrite";
import { bandsintownAdapter } from "./bandsintown";
import { songkickAdapter } from "./songkick";
import { canonicalizeCategory } from "./utils";
import type { SourceAdapter } from "./types";

// Keyed by canonical category names only — aliases are resolved via canonicalizeCategory()
export const CATEGORY_SOURCES: Record<string, SourceAdapter[]> = {
  "Tech": [lumaAdapter, meetupAdapter, eventbriteAdapter],
  "Music": [bandsintownAdapter, songkickAdapter, eventbriteAdapter],
  "Food": [lumaAdapter, eventbriteAdapter],
  "Wellness": [lumaAdapter, meetupAdapter, eventbriteAdapter],
  "Civics": [meetupAdapter, eventbriteAdapter],
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
