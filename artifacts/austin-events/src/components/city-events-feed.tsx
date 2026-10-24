import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CalendarClock, Radio } from "lucide-react";
import { useTenant } from "@/contexts/tenant-context";

type CityFeedEvent = {
  id: string;
  citySlug: string;
  cityName: string;
  title: string;
  date: string;
  startDate?: string;
  timezone?: string;
  weekOf: string;
  interestUrl: string;
};

type CityFeedResponse = { events: CityFeedEvent[] };

const CITY_TIMEZONES: Record<string, string> = {
  austin: "America/Chicago",
  atlanta: "America/New_York",
  houston: "America/Chicago",
  sanfrancisco: "America/Los_Angeles",
  sacramento: "America/Los_Angeles",
  miami: "America/New_York",
  boston: "America/New_York",
  la: "America/Los_Angeles",
  stlouis: "America/Chicago",
  portland: "America/Los_Angeles",
  bulverde: "America/Chicago",
  brushycreek: "America/Chicago",
  dc: "America/New_York",
  manchester: "Europe/London",
  nyc: "America/New_York",
  dallas: "America/Chicago",
  tokyo: "Asia/Tokyo",
  osaka: "Asia/Tokyo",
};

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function cityTimezone(event: CityFeedEvent) {
  return event.timezone || CITY_TIMEZONES[event.citySlug] || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function localDayKey(date: Date, timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
}

function eventDayKey(event: CityFeedEvent): string | undefined {
  const timezone = cityTimezone(event);
  const structured = event.startDate?.trim();
  if (structured && /^\d{4}-\d{2}-\d{2}$/.test(structured)) return structured;
  if (structured && Number.isFinite(Date.parse(structured))) {
    return localDayKey(new Date(structured), timezone);
  }

  const source = event.date || "";
  const iso = source.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const monthDay = source.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})(?:,?\s+(20\d{2}))?/i);
  if (!monthDay) return undefined;
  const month = MONTHS[monthDay[1].slice(0, 3).toLowerCase()];
  const year = monthDay[3] || event.weekOf.slice(0, 4);
  if (!month || !/^\d{4}$/.test(year)) return undefined;
  return `${year}-${month}-${String(Number(monthDay[2])).padStart(2, "0")}`;
}

async function fetchCityFeed(): Promise<CityFeedResponse> {
  const response = await fetch("/api/events/upcoming-across-cities");
  if (!response.ok) throw new Error("The city event feed is temporarily unavailable.");
  return response.json() as Promise<CityFeedResponse>;
}

export function CityEventsFeed() {
  const tenant = useTenant();
  const [now, setNow] = useState(() => new Date());
  const { data, isLoading, isError } = useQuery({
    queryKey: ["city-events-feed"],
    queryFn: fetchCityFeed,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const upcomingEvents = useMemo(() => {
    const dated = (data?.events ?? [])
      .map(event => ({ event, day: eventDayKey(event) }))
      .filter((item): item is { event: CityFeedEvent; day: string } => Boolean(item.day))
      .filter(({ event, day }) => day > localDayKey(now, cityTimezone(event)))
      .sort((a, b) => a.day.localeCompare(b.day) || a.event.title.localeCompare(b.event.title));
    const eventsByDay = new Map<string, typeof dated>();
    for (const item of dated) {
      const sameDay = eventsByDay.get(item.day) ?? [];
      sameDay.push(item);
      eventsByDay.set(item.day, sameDay);
    }

    const spreadOut: typeof dated = [];
    for (const sameDay of eventsByDay.values()) {
      const byCity = new Map<string, typeof dated>();
      for (const item of sameDay) {
        const cityEvents = byCity.get(item.event.citySlug) ?? [];
        cityEvents.push(item);
        byCity.set(item.event.citySlug, cityEvents);
      }
      const cityQueues = [...byCity.entries()]
        .sort(([, a], [, b]) => a[0].event.cityName.localeCompare(b[0].event.cityName))
        .map(([, cityEvents]) => cityEvents);
      while (cityQueues.some(queue => queue.length)) {
        for (const queue of cityQueues) {
          const next = queue.shift();
          if (next) spreadOut.push(next);
        }
      }
    }
    return spreadOut.slice(0, 40);
  }, [data?.events, now]);

  return (
    <aside
      aria-labelledby="city-events-feed-title"
      data-testid="panel-city-events-feed"
      className="mt-6 overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-lg shadow-black/5"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="min-w-0">
          <h2 id="city-events-feed-title" className="font-serif text-lg font-bold text-foreground">
            Coming up across IRL
          </h2>
          <p className="text-xs text-muted-foreground">Upcoming events from every city</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          <Radio className="h-3 w-3" aria-hidden="true" />
          Live
        </span>
      </div>

      <div className="max-h-[360px] overflow-y-auto overscroll-contain">
        {isLoading ? (
          <div className="space-y-3 p-4" role="status" aria-label="Loading upcoming city events">
            {[1, 2, 3, 4].map(index => (
              <div key={index} className="h-5 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : isError ? (
          <p className="px-4 py-5 text-sm text-muted-foreground" role="status" data-testid="status-city-events-feed-error">
            The cross-city feed could not load. It will try again shortly.
          </p>
        ) : upcomingEvents.length === 0 ? (
          <div className="flex items-center gap-2 px-4 py-5 text-sm text-muted-foreground" data-testid="status-city-events-feed-empty">
            <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
            New upcoming events will appear here as city editions are updated.
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {upcomingEvents.map(({ event, day }) => {
              const monthDay = `${Number(day.slice(5, 7))}/${Number(day.slice(8, 10))}`;
              return (
                <li key={`${event.citySlug}-${event.id}`} data-testid={`row-city-event-${event.citySlug}-${event.id}`}>
                  <div className="flex min-w-0 items-center gap-2 px-3 py-2.5 text-xs">
                    <span className="w-[58px] shrink-0 truncate font-semibold text-primary" title={event.cityName}>
                      {event.cityName.split(",")[0]}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-foreground" title={event.title}>
                      {event.title}
                    </span>
                    <time
                      dateTime={day}
                      title={new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}
                      className="shrink-0 font-medium tabular-nums text-muted-foreground"
                    >
                      {monthDay}
                    </time>
                    <a
                      href={event.interestUrl}
                      data-testid={`link-interest-${event.citySlug}-${event.id}`}
                      aria-label={`Interested in ${event.title} in ${event.cityName} on ${monthDay}`}
                      className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-primary underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      Interested?
                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="border-t border-border/70 px-4 py-2 text-[10px] text-muted-foreground">
        Refreshes automatically. Dates are shown in each event’s city.
      </p>
    </aside>
  );
}
