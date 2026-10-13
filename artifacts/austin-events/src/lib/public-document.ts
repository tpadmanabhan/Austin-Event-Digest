export interface PublicEvent {
  id: string;
  title: string;
  date: string;
  venue: string;
  description: string;
  link?: string | null;
  imageUrl?: string | null;
  category: string;
  featured?: boolean;
  isPost?: boolean;
  isBusinessSpotlight?: boolean;
  startDate?: string;
  endDate?: string;
  venueAddress?: string;
  timezone?: string;
  venueId?: string;
  url?: string;
  venueUrl?: string;
}

export interface PublicDocumentModel {
  kind: "platform" | "city" | "digest" | "event" | "venue" | "about" | "deals" | "not-found" | "unavailable" | "private";
  title: string;
  description: string;
  canonical: string;
  cityName?: string;
  siteName?: string;
  intro?: string;
  citySlug?: string;
  weekOf?: string;
  digestId?: number;
  events: PublicEvent[];
  event?: PublicEvent;
  venueName?: string;
  cities: { slug: string; name: string; url: string }[];
  editionUrl?: string;
  homeUrl: string;
  noindex?: boolean;
  schema?: Record<string, unknown>;
}

export function displayPublicWeek(value: string): string {
  const day = value.match(/^(\d{4}-\d{2}-\d{2})(?:T|$)/)?.[1];
  if (!day || !Number.isFinite(Date.parse(value))) return value;
  const date = new Date(`${day}T00:00:00.000Z`);
  if (date.toISOString().slice(0, 10) !== day) return value;
  // Edition dates are calendar labels, not instants in the reader's timezone.
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC", month: "long", day: "numeric", year: "numeric",
  }).format(date);
}

export function publicCityLabel(city: Pick<PublicDocumentModel["cities"][number], "name" | "slug">): string {
  const suffix = city.slug === "austincares" ? "deals" : "events";
  const hasSuffix = city.slug === "austincares" ? /\bdeals$/i.test(city.name) : /\bevents$/i.test(city.name);
  return hasSuffix ? city.name : `${city.name} ${suffix}`;
}

export function displayPublicEventDate(event: Pick<PublicEvent, "date" | "startDate" | "timezone">): string {
  const start = event.startDate;
  if (!start || !/^\d{4}-\d{2}-\d{2}/.test(start) || !Number.isFinite(Date.parse(start))) return event.date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "short", day: "numeric", year: "numeric" }).format(new Date(start));
  }
  const timeZone = event.timezone || (start.endsWith("Z") ? "UTC" : undefined);
  if (!timeZone) return start;
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", month: "short", day: "numeric",
      year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(start));
  } catch { return start; }
}

declare global {
  interface Window {
    __PUBLIC_DOCUMENT__?: PublicDocumentModel;
  }
}
