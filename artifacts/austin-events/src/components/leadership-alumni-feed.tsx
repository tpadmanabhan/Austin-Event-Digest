import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ExternalLink, Radio } from "lucide-react";
import { RsvpBox } from "@/components/event-card";
import type { LeadershipManagedEvent } from "@/hooks/use-events";

async function fetchLeadershipEvents(): Promise<{ events: LeadershipManagedEvent[] }> {
  const response = await fetch("/api/events/leadership-managed");
  if (!response.ok) throw new Error("The alumni event feed could not load.");
  return response.json();
}

export function LeadershipAlumniFeed() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["leadership-managed-events"],
    queryFn: fetchLeadershipEvents,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  return (
    <aside
      aria-labelledby="leadership-alumni-feed-title"
      data-testid="panel-leadership-alumni-events"
      className="mt-6 overflow-hidden rounded-2xl border border-[#314363]/25 bg-card/95 shadow-lg shadow-black/5"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#314363]/15 px-4 py-3">
        <div className="min-w-0">
          <h2 id="leadership-alumni-feed-title" className="font-serif text-lg font-bold text-foreground">
            Upcoming Events
          </h2>
          <p className="text-xs text-muted-foreground">Shared by Leadership Austin alumni</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          <Radio className="h-3 w-3" aria-hidden="true" />
          Live
        </span>
      </div>

      <div className="max-h-[460px] overflow-y-auto overscroll-contain">
        {isLoading ? (
          <div className="space-y-3 p-4" role="status" aria-label="Loading alumni-sourced events">
            {[1, 2, 3].map(index => <div key={index} className="h-16 animate-pulse rounded-xl bg-muted" />)}
          </div>
        ) : isError ? (
          <p className="px-4 py-5 text-sm text-muted-foreground" role="status" data-testid="status-leadership-alumni-error">
            The event list could not load. It will try again shortly.
          </p>
        ) : !data?.events.length ? (
          <div className="flex items-center gap-2 px-4 py-5 text-sm text-muted-foreground" data-testid="status-leadership-alumni-empty">
            <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
            New alumni-shared events will appear here.
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {data.events.map(event => (
              <li key={event.id} data-testid={`row-leadership-alumni-${event.id}`} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <a
                    href={event.link || "#"}
                    target={event.link ? "_blank" : undefined}
                    rel={event.link ? "noopener noreferrer" : undefined}
                    className="font-semibold leading-snug text-foreground hover:text-primary"
                  >
                    {event.title}
                    {event.link && <ExternalLink className="ml-1 inline h-3.5 w-3.5" aria-hidden="true" />}
                  </a>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                    {event.category}
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-primary">{event.date}</p>
                <p className="mt-1 text-xs text-muted-foreground">{event.venue}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{event.description}</p>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Shared by {event.sourceAlumni}{event.sourceName ? ` · ${event.sourceName}` : ""}
                </p>
                <RsvpBox
                  managedEventId={event.id}
                  eventTitle={event.title}
                  eventDate={event.date}
                  eventVenue={event.venue}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="border-t border-border/70 px-4 py-2 text-[10px] text-muted-foreground">
        Interest counts here are separate from Austin.irl.group.
      </p>
    </aside>
  );
}
