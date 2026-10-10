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
  events: PublicEvent[];
  event?: PublicEvent;
  venueName?: string;
  cities: { slug: string; name: string; url: string }[];
  editionUrl?: string;
  homeUrl: string;
  noindex?: boolean;
  schema?: Record<string, unknown>;
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
