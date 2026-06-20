import type { EventItem } from "@workspace/db";

export interface CityGeo {
  lat: number;
  lon: number;
  timezone: string;
  slug: string;
}

const CITY_GEO: Record<string, CityGeo> = {
  "Austin": { lat: 30.2672, lon: -97.7431, timezone: "America/Chicago", slug: "austin-tx" },
  "Austin, TX": { lat: 30.2672, lon: -97.7431, timezone: "America/Chicago", slug: "austin-tx" },
  "Austin, Texas": { lat: 30.2672, lon: -97.7431, timezone: "America/Chicago", slug: "austin-tx" },
  "New York": { lat: 40.7128, lon: -74.0060, timezone: "America/New_York", slug: "new-york-ny" },
  "New York, NY": { lat: 40.7128, lon: -74.0060, timezone: "America/New_York", slug: "new-york-ny" },
  "San Francisco": { lat: 37.7749, lon: -122.4194, timezone: "America/Los_Angeles", slug: "san-francisco-ca" },
  "San Francisco, CA": { lat: 37.7749, lon: -122.4194, timezone: "America/Los_Angeles", slug: "san-francisco-ca" },
  "Los Angeles": { lat: 34.0522, lon: -118.2437, timezone: "America/Los_Angeles", slug: "los-angeles-ca" },
  "Los Angeles, CA": { lat: 34.0522, lon: -118.2437, timezone: "America/Los_Angeles", slug: "los-angeles-ca" },
  "Chicago": { lat: 41.8781, lon: -87.6298, timezone: "America/Chicago", slug: "chicago-il" },
  "Chicago, IL": { lat: 41.8781, lon: -87.6298, timezone: "America/Chicago", slug: "chicago-il" },
  "Seattle": { lat: 47.6062, lon: -122.3321, timezone: "America/Los_Angeles", slug: "seattle-wa" },
  "Seattle, WA": { lat: 47.6062, lon: -122.3321, timezone: "America/Los_Angeles", slug: "seattle-wa" },
  "Denver": { lat: 39.7392, lon: -104.9903, timezone: "America/Denver", slug: "denver-co" },
  "Denver, CO": { lat: 39.7392, lon: -104.9903, timezone: "America/Denver", slug: "denver-co" },
  "Miami": { lat: 25.7617, lon: -80.1918, timezone: "America/New_York", slug: "miami-fl" },
  "Miami, FL": { lat: 25.7617, lon: -80.1918, timezone: "America/New_York", slug: "miami-fl" },
  "Boston": { lat: 42.3601, lon: -71.0589, timezone: "America/New_York", slug: "boston-ma" },
  "Boston, MA": { lat: 42.3601, lon: -71.0589, timezone: "America/New_York", slug: "boston-ma" },
};

export function getCityGeo(city: string): CityGeo | null {
  const normalized = city.trim();
  return CITY_GEO[normalized] || CITY_GEO[normalized.split(",")[0].trim()] || null;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Tech: ["tech", "software", "startup", "AI", "developer", "coding", "hackathon", "entrepreneur", "venture", "SaaS", "fintech"],
  Music: ["music", "concert", "live music", "band", "jazz", "blues", "rock", "festival", "DJ", "open mic", "hip hop", "indie"],
  Food: ["food", "dining", "restaurant", "taco", "BBQ", "farmers market", "cooking", "dinner", "brunch", "culinary", "craft beer", "wine"],
  Wellness: ["yoga", "fitness", "run", "hike", "bike", "outdoor", "wellness", "meditation", "pilates", "gym", "health", "trail"],
  Civics: ["community", "civic", "volunteer", "nonprofit", "neighborhood", "policy", "local government", "advocacy", "social impact"],
};

export function getCategoryKeywords(category: string): string[] {
  return CATEGORY_KEYWORDS[category] || [category.toLowerCase()];
}

export function getCategorySearchQuery(category: string): string {
  const keywords = getCategoryKeywords(category);
  return keywords.slice(0, 3).join(" ");
}

export function formatISODate(isoStr: string, timezone = "America/Chicago"): string {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const datePart = d.toLocaleDateString("en-US", {
      weekday: "long", month: "short", day: "numeric",
      timeZone: timezone,
    });
    const timePart = d.toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit", hour12: true,
      timeZone: timezone,
    });
    return `${datePart} at ${timePart}`;
  } catch {
    return isoStr;
  }
}

function extractDateKey(dateStr: string): string {
  if (!dateStr) return "";
  const iso = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[2]}-${iso[3]}`;
  const m = dateStr.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})/i);
  if (m) return `${m[1].substring(0, 3).toLowerCase()}-${m[2]}`;
  return dateStr.substring(0, 10).toLowerCase().replace(/\s+/g, "-");
}

export function deduplicateEvents(events: EventItem[]): EventItem[] {
  const seen = new Set<string>();
  return events.filter(e => {
    const titleKey = e.title.toLowerCase().replace(/\s+/g, " ").substring(0, 40);
    const dateKey = extractDateKey(e.date || "");
    const key = `${titleKey}|${dateKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const TENANT_TO_GUESS_CATEGORIES: Record<string, string[]> = {
  "Tech": ["Tech & Business"],
  "Music": ["Music"],
  "Food": ["Food & Drink"],
  "Food & Drink": ["Food & Drink"],
  "Wellness": ["Outdoors & Fitness"],
  "Wellness & Fitness": ["Outdoors & Fitness"],
  "Civics": ["Community"],
  "Community": ["Community"],
  "Arts & Culture": ["Arts & Culture"],
  "Learning": ["Learning"],
};

export function filterByTenantCategories(events: EventItem[], tenantCategories: string[]): EventItem[] {
  if (tenantCategories.length === 0) return events;

  const acceptedGuessCats = new Set<string>();
  for (const cat of tenantCategories) {
    const mapped = TENANT_TO_GUESS_CATEGORIES[cat] || [cat];
    mapped.forEach(gc => acceptedGuessCats.add(gc));
  }

  return events.filter(event => {
    if (event.category && acceptedGuessCats.has(event.category)) return true;
    const guessed = guessCategory(`${event.title} ${event.description || ""}`);
    if (acceptedGuessCats.has(guessed)) return true;
    if (!event.category || event.category === "Events") return true;
    return false;
  });
}

export function isWithinDateRange(isoStr: string, weekOf: Date, weekEnd?: Date): boolean {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return true;
    const end = weekEnd || new Date(weekOf.getTime() + 7 * 24 * 60 * 60 * 1000);
    return d >= weekOf && d < end;
  } catch {
    return true;
  }
}

export function guessCategory(text: string): string {
  const lower = text.toLowerCase();
  if (/music|concert|band|live|jazz|blues|country|rock|festival|open mic/.test(lower)) return "Music";
  if (/food|eat|restaurant|taco|bbq|market|farm|chef|dinner|brunch|culinary|happy hour/.test(lower)) return "Food & Drink";
  if (/art|gallery|exhibit|museum|film|movie|comedy|theater|theatre|performance|dance/.test(lower)) return "Arts & Culture";
  if (/tech|startup|ai\b|code|developer|hackathon|meetup|entrepreneur|venture|founder/.test(lower)) return "Tech & Business";
  if (/run|hike|bike|yoga|fitness|outdoor|park|trail|swim|sport|wellness/.test(lower)) return "Outdoors & Fitness";
  if (/family|kid|child|community|volunteer|nonprofit|charity/.test(lower)) return "Community";
  if (/class|learn|education|seminar|conference|summit|workshop/.test(lower)) return "Learning";
  if (/language|exchange|cultural|international/.test(lower)) return "Cultural";
  return "Events";
}
