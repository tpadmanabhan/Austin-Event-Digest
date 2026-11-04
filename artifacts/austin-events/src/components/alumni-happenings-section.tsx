import { ArrowUpRight, CalendarDays, Newspaper } from "lucide-react";

type AlumniEntry = {
  id?: string | number;
  title: string;
  description?: string;
  link?: string | null;
  linkText?: string;
  date?: string;
  venue?: string;
  alumniHappeningType?: "event" | "news" | string;
};

export function AlumniHappeningsSection({
  events,
  className = "",
  compact = false,
}: {
  events: AlumniEntry[];
  className?: string;
  compact?: boolean;
}) {
  const alumni = events.filter((entry) => entry?.alumniHappeningType === "event" || entry?.alumniHappeningType === "news");
  const newsEntries = alumni.filter((entry) => entry.alumniHappeningType === "news");
  const eventEntries = alumni.filter((entry) => entry.alumniHappeningType === "event");
  const formatDate = (value?: string) => {
    if (!value) return "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = new Date(`${value}T00:00:00.000Z`);
    return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(date);
  };
  return (
    <section className={`leadership-alumni-panel rounded-sm p-6 sm:p-8 ${className}`} aria-labelledby="alumni-happenings-title" data-testid="section-alumni-happenings">
      <div className="flex flex-col gap-4 border-b border-white/20 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[.24em] text-[#4EBEE7]">Leadership Austin · Community notes</p>
          <h2 id="alumni-happenings-title" className="text-4xl font-bold uppercase leading-none sm:text-5xl">Alumni Happenings</h2>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-white/75">A pulse on the people, programs, and ideas moving Austin forward.</p>
      </div>
      {alumni.length ? (
        <div className="mt-5 space-y-7">
          {newsEntries.length > 0 && (
            <ul className="list-disc space-y-5 pl-5 marker:text-[#FFBA01]" data-testid="alumni-news-list">
              {newsEntries.map((entry, index) => (
                <li key={entry.id ?? `${entry.title}-${index}`} className="pl-2" data-testid={`alumni-news-${entry.id ?? index}`}>
                  <h3 className="text-xl font-bold leading-tight text-white">{entry.title}</h3>
                  {entry.description && <p className="mt-1.5 text-sm leading-relaxed text-white/75">{entry.description}</p>}
                  {entry.link && (
                    <a href={entry.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#FFBA01] hover:text-white" data-testid={`alumni-source-${entry.id ?? index}`}>
                      {entry.linkText?.trim() || "Learn more"} <ArrowUpRight className="h-4 w-4" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
          {eventEntries.length > 0 && (
            <div className={`grid gap-3 ${compact ? "" : "md:grid-cols-2"}`}>
          {eventEntries.map((entry, index) => {
            const isEvent = entry.alumniHappeningType === "event";
            const Icon = isEvent ? CalendarDays : Newspaper;
            return (
              <article key={entry.id ?? `${entry.title}-${index}`} className="group flex min-w-0 flex-col border border-white/15 bg-white/[.06] p-5 transition-transform duration-300 hover:-translate-y-1" data-testid={`alumni-happening-${entry.id ?? index}`}>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#B0DC5F]">
                  <Icon className="h-3.5 w-3.5" />
                  {isEvent ? "Alumni event" : "Community story"}
                </div>
                <h3 className="mt-3 text-2xl font-bold leading-tight text-white">{entry.title}</h3>
                {(entry.date || entry.venue) && (
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#4EBEE7]">
                    {[formatDate(entry.date), entry.venue].filter(Boolean).join(" · ")}
                  </p>
                )}
                {entry.description && <p className="mt-3 text-sm leading-relaxed text-white/75">{entry.description}</p>}
                {entry.link && (
                  <a href={entry.link} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex w-fit items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#FFBA01] hover:text-white" data-testid={`alumni-source-${entry.id ?? index}`}>
                    {entry.linkText?.trim() || "Event details"} <ArrowUpRight className="h-4 w-4" />
                  </a>
                )}
              </article>
            );
          })}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5 border border-dashed border-white/25 px-5 py-6 text-sm text-white/65" data-testid="empty-alumni-happenings">
          New alumni events and community stories will appear here.
        </div>
      )}
    </section>
  );
}
