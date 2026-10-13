import { CalendarDays, ExternalLink, MapPin } from "lucide-react";

export const MIAMI_OPEN_LINK = "https://www.miamiopen.com/";
const norm = (u?: string | null) => (u ?? "").trim().replace(/\/+$/, "").toLowerCase();

/** True only for the curated Miami Open feature on the Miami tenant. */
export function isMiamiFeaturedEvent(e: any, citySlug?: string | null): boolean {
  return citySlug === "miami" && e?.featured === true && norm(e?.link) === norm(MIAMI_OPEN_LINK);
}

/** Split stored description into its first sentence (emphasized) and the rest. */
export function splitLead(description?: string | null): [string, string] {
  const text = (description ?? "").trim();
  const m = text.match(/^(.+?[.!?])(\s+|$)([\s\S]*)$/);
  return m ? [m[1], m[3].trim()] : [text, ""];
}

type FeaturedEvent = {
  title: string;
  date: string;
  venue?: string | null;
  venueAddress?: string | null;
  description?: string | null;
  link?: string | null;
  url?: string | null;
};

export function MiamiFeaturedEvent({ event, headingLevel = "h2", className = "" }: { event: FeaturedEvent; headingLevel?: "h2" | "h3"; className?: string }) {
  const H = headingLevel;
  const [lead, rest] = splitLead(event.description);
  return (
    <section id="miami-open-featured" aria-labelledby="miami-featured-heading" data-testid="section-miami-featured-event" className={className}>
      <H id="miami-featured-heading" className="mb-5 flex items-center gap-3 font-serif text-2xl font-bold sm:text-3xl" style={{ color: "#12323A" }}>
        <span className="h-1 w-8 rounded-full" style={{ background: "#E8664A" }} />
        Featured event
      </H>
      <article
        data-testid="card-miami-featured-event"
        className="relative overflow-hidden rounded-3xl border p-6 sm:p-8"
        style={{ background: "linear-gradient(150deg, #0E5560 0%, #0B3F48 100%)", borderColor: "#0E5560", color: "#FBF4EA" }}
      >
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full" style={{ background: "radial-gradient(circle, rgba(232,102,74,.55), transparent 65%)" }} />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1" style={{ background: "linear-gradient(90deg,#E8664A 0 33%,#8FD3C4 33% 66%,#F6EBDD 66%)" }} />
        <div className="relative">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span data-testid="badge-miami-attending" className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[.16em]" style={{ background: "#E8664A", color: "#FBF4EA" }}>I’ll be attending</span>
            <span className="rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[.16em]" style={{ borderColor: "rgba(143,211,196,.5)", color: "#8FD3C4" }}>Sports</span>
          </div>
          <h3 className="font-serif text-3xl font-bold leading-tight sm:text-4xl" style={{ color: "#FBF4EA" }}>{event.title}</h3>
          <p className="mt-4 font-serif text-xl italic sm:text-2xl" style={{ color: "#F4A58F" }} data-testid="text-miami-featured-lead">
            <strong className="font-bold">{lead}</strong>
          </p>
          {rest ? <p className="mt-3 max-w-2xl text-sm leading-7" style={{ color: "rgba(251,244,234,.82)" }}>{rest}</p> : null}
          <dl className="mt-5 grid gap-2 text-sm sm:grid-cols-2" style={{ color: "rgba(251,244,234,.9)" }}>
            <div className="flex gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#8FD3C4" }} /><dt className="sr-only">Date</dt><dd>{event.date}</dd></div>
            {event.venue ? <div className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#8FD3C4" }} /><dt className="sr-only">Venue</dt><dd>{event.venue}{event.venueAddress && !event.venue.includes(event.venueAddress) ? `, ${event.venueAddress}` : ""}</dd></div> : null}
          </dl>
          <p className="mt-6 flex flex-wrap gap-3">
            {event.link ? (
              <a href={event.link} target="_blank" rel="noopener noreferrer" data-testid="link-miami-featured-official"
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-transform hover:-translate-y-0.5"
                style={{ background: "#FBF4EA", color: "#0B3F48" }}>
                Official Miami Open site <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
            {event.url ? (
              <a href={event.url} data-testid="link-miami-featured-details" className="inline-flex items-center rounded-full border px-5 py-2.5 text-sm font-semibold" style={{ borderColor: "rgba(251,244,234,.4)", color: "#FBF4EA" }}>
                Event details
              </a>
            ) : null}
          </p>
        </div>
      </article>
    </section>
  );
}
