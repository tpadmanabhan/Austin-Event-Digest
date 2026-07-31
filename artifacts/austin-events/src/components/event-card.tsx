import { useState, useEffect, useRef } from "react";
import { Calendar, MapPin, ExternalLink, Music, Utensils, Laptop, Ticket, Sparkles, CheckCircle2, Loader2, CalendarPlus } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { EventItem } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TurnstileWidget } from "@/components/turnstile-widget";

const SOURCE_URLS: Record<string, string> = {
  "The Austin Business Review": "https://austinbusinessreview.com/",
  "Luma": "https://lu.ma/austin",
  "ATX Today": "https://atxtoday.6amcity.com",
  "Greater Asian Chamber of Commerce": "https://members.austinasianchamber.org/events?_gl=1*1gwyy91*_ga*MjM4NTUzNjU2LjE3Nzg0NTE2NDk.*_ga_34Z9ZMSYKX*czE3ODExMDA1NzIkbzYkZzAkdDE3ODExMDA1NzIkajYwJGwwJGgw",
  "What's Weird ATX": "https://whatsweirdatx.substack.com",
  "The Weekly Common": "https://theweeklycommon.substack.com",
};

// ---------------------------------------------------------------------------
// Date parsing helpers for calendar export
// ---------------------------------------------------------------------------

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseEventDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;

  // Try ISO parse first (precise timestamps)
  try {
    const d = parseISO(dateStr);
    if (!isNaN(d.getTime())) return d;
  } catch { /* fall through */ }

  // Parse human-readable: "Sunday, Aug 3 at 2:00 PM", "Aug 3", "Aug 3 at 2pm", etc.
  const m = dateStr.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[a-z]*\.?\s+(\d{1,2})(?:[^,]*?at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm))?/i,
  );
  if (!m) return null;

  const monthKey = m[1].substring(0, 3).toLowerCase();
  const month = MONTH_MAP[monthKey];
  if (month === undefined) return null;

  const day = parseInt(m[2], 10);
  let hour = m[3] ? parseInt(m[3], 10) : 12;
  const min = m[4] ? parseInt(m[4], 10) : 0;
  const ampm = m[5]?.toLowerCase();
  if (ampm === "pm" && hour !== 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;

  const year = new Date().getFullYear();
  return new Date(year, month, day, hour, min, 0);
}

function toCalDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
}

function buildGoogleCalUrl(event: EventItem): string {
  const start = parseEventDate(event.date);
  const end = start ? new Date(start.getTime() + 2 * 3600_000) : null;
  const params = new URLSearchParams({ text: event.title });
  if (start && end) params.set("dates", `${toCalDate(start)}/${toCalDate(end)}`);
  if (event.venue) params.set("location", event.venue);
  if (event.description) params.set("details", event.description.slice(0, 500));
  return `https://calendar.google.com/calendar/r/eventedit?${params.toString()}`;
}

function buildIcs(event: EventItem): string {
  const start = parseEventDate(event.date) ?? new Date();
  const end = new Date(start.getTime() + 2 * 3600_000);
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
  const now = new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EventCarpooling//EN",
    "BEGIN:VEVENT",
    `DTSTAMP:${toCalDate(now)}`,
    `DTSTART:${toCalDate(start)}`,
    `DTEND:${toCalDate(end)}`,
    `SUMMARY:${esc(event.title)}`,
    event.venue ? `LOCATION:${esc(event.venue)}` : "",
    event.description ? `DESCRIPTION:${esc(event.description.slice(0, 500))}` : "",
    event.link ? `URL:${event.link}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}

function downloadIcs(event: EventItem): void {
  const blob = new Blob([buildIcs(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.title.replace(/[^a-z0-9]/gi, "-").toLowerCase().slice(0, 60)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Calendar popover
// ---------------------------------------------------------------------------

function AddToCalendarButton({ event }: { event: EventItem }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
        title="Add to calendar"
        className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
      >
        <CalendarPlus className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl bg-popover border border-border shadow-xl overflow-hidden">
          <a
            href={buildGoogleCalUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M3 9h18" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M8 13h2v2H8zM11 13h2v2h-2zM14 13h2v2h-2zM8 16h2v2H8zM11 16h2v2h-2z" fill="currentColor"/>
            </svg>
            Google Calendar
          </a>
          <button
            onClick={() => { downloadIcs(event); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors border-t border-border/50"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 20h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Apple / Outlook (.ics)
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeFormat(dateStr: string | null | undefined, fmt: string): string {
  if (!dateStr) return "TBD";
  try {
    const d = parseISO(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return format(d, fmt);
  } catch {
    return dateStr;
  }
}

function isIsoDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  try {
    const d = parseISO(dateStr);
    return !isNaN(d.getTime());
  } catch {
    return false;
  }
}

function getRsvpKey(digestId: number, eventTitle: string) {
  return `rsvp_${digestId}_${encodeURIComponent(eventTitle)}`;
}

function useRsvpState(digestId: number | undefined, eventTitle: string) {
  const key = digestId ? getRsvpKey(digestId, eventTitle) : null;
  const [rsvpd, setRsvpd] = useState(() => key ? localStorage.getItem(key) === "1" : false);

  const markRsvpd = () => {
    if (key) localStorage.setItem(key, "1");
    setRsvpd(true);
  };

  return { rsvpd, markRsvpd };
}

// ---------------------------------------------------------------------------
// RSVP box
// ---------------------------------------------------------------------------

interface RsvpBoxProps {
  digestId: number;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
}

function RsvpBox({ digestId, eventTitle, eventDate, eventVenue }: RsvpBoxProps) {
  const { rsvpd, markRsvpd } = useRsvpState(digestId, eventTitle);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [confirmedName, setConfirmedName] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">(rsvpd ? "done" : "idle");
  const [count, setCount] = useState<number | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  useEffect(() => {
    if (digestId && eventTitle) {
      fetch(`/api/rsvp?digestId=${digestId}&eventTitle=${encodeURIComponent(eventTitle)}`)
        .then(r => r.json())
        .then(data => setCount(data.count ?? 0))
        .catch(() => {});
    }
  }, [digestId, eventTitle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !firstName.trim() || !captchaToken) return;

    setStatus("submitting");
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digestId, eventTitle, email, name: firstName.trim(), captchaToken }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("done");
        setShowForm(false);
        setCount(data.count);
        setConfirmedName(firstName.trim());
        markRsvpd();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  // Suppress unused-var warning for eventDate / eventVenue (kept for future use)
  void eventDate; void eventVenue;

  if (status === "done") {
    return (
      <div className="mt-auto pt-4 border-t border-border/50">
        <div className="flex items-center gap-2 text-primary text-sm font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>
            {confirmedName ? `You're in, ${confirmedName}! ✨` : "You're in! ✨"}
            <span className="font-normal text-muted-foreground ml-1">Other subscribers have been notified.</span>
          </span>
        </div>
        {count && count > 1 && (
          <p className="text-xs text-muted-foreground mt-1 pl-6">{count} people interested</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-auto pt-4 border-t border-border/50">
      {!showForm ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            {count !== null && count > 0 && (
              <span className="text-xs font-semibold text-primary">({count} interested)</span>
            )}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm(true)}
            className="shrink-0 text-xs font-semibold border-primary/40 text-primary hover:bg-primary/5"
          >
            Interested?
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            Let others know you're going!
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="First name"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="h-9 text-sm rounded-lg"
              required
            />
            <Input
              placeholder="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="h-9 text-sm rounded-lg"
              required
            />
          </div>
          <TurnstileWidget
            onSuccess={setCaptchaToken}
            onError={() => setCaptchaToken(null)}
            onExpire={() => setCaptchaToken(null)}
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={status === "submitting" || !captchaToken || !email || !firstName.trim()}
              className="flex-1 text-xs disabled:opacity-50"
            >
              {status === "submitting"
                ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Submitting…</>
                : "Count me in!"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => { setShowForm(false); setStatus("idle"); }}
              className="text-xs"
            >
              Cancel
            </Button>
          </div>
          {status === "error" && (
            <p className="text-xs text-destructive">Something went wrong. Please try again.</p>
          )}
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EventCard
// ---------------------------------------------------------------------------

export function EventCard({ event, digestId, distanceMiles }: { event: EventItem; digestId?: number; distanceMiles?: number }) {
  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("music") || cat.includes("concert")) return <Music className="w-4 h-4" />;
    if (cat.includes("food") || cat.includes("dining")) return <Utensils className="w-4 h-4" />;
    if (cat.includes("tech") || cat.includes("startup")) return <Laptop className="w-4 h-4" />;
    return <Ticket className="w-4 h-4" />;
  };

  const getCategoryColor = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("tech") || cat.includes("business") || cat.includes("startup")) return "bg-secondary/10 text-secondary border-secondary/20";
    if (cat.includes("wellness") || cat.includes("meditation") || cat.includes("yoga") || cat.includes("mindfulness")) return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800";
    if (cat.includes("sport") || cat.includes("fitness") || cat.includes("outdoor")) return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800";
    if (cat.includes("civic") || cat.includes("community") || cat.includes("volunteer") || cat.includes("nonprofit")) return "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800";
    return "bg-[#f5ead8] text-[#7a5230] border-[#d4b896] dark:bg-[#4a3520]/30 dark:text-[#d4b896] dark:border-[#7a5230]";
  };

  return (
    <div className={`group relative flex flex-col rounded-2xl bg-card border shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 h-full ${event.link ? "border-primary/40 border-t-2 border-t-primary hover:border-primary/60" : "border-border hover:border-primary/30"}`}>
      {event.imageUrl && (
        <div className="w-full overflow-hidden bg-muted rounded-t-2xl" style={{ height: "160px" }}>
          <img
            src={event.imageUrl}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}
      
      <div className="flex flex-1 flex-col p-6">
        {(() => {
          const dailyUntil = (event as any).dailyUntil as string | undefined;
          const todayLabel = dailyUntil
            ? new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
            : null;
          return (
            <div className="flex items-start justify-between gap-2 mb-4">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${getCategoryColor(event.category)}`}>
                {getCategoryIcon(event.category)}
                {event.category}
              </span>
              <div className="flex items-center gap-1">
                <div className="flex flex-col items-end text-right">
                  <span className="text-sm font-bold text-primary flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {todayLabel ? <>Today · {todayLabel}</> : safeFormat(event.date, "MMM d, yyyy")}
                  </span>
                  {!todayLabel && isIsoDate(event.date) && (
                    <span className="text-xs text-muted-foreground mt-1">
                      {safeFormat(event.date, "h:mm a")}
                    </span>
                  )}
                  {todayLabel && (
                    <span className="text-xs text-muted-foreground mt-1">Daily through Friday, Jun 19</span>
                  )}
                </div>
                <AddToCalendarButton event={event} />
              </div>
            </div>
          );
        })()}

        <div className="relative group/title-wrap mb-3">
          <h3 className="font-serif text-2xl font-bold leading-tight text-foreground line-clamp-2">
            {event.link ? (
              <a
                href={event.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group/title inline-flex items-start gap-2 hover:text-primary transition-colors"
              >
                {event.title}
                <ExternalLink className="w-4 h-4 shrink-0 mt-1 opacity-0 group-hover/title:opacity-100 transition-opacity" />
              </a>
            ) : (
              event.title
            )}
          </h3>
          {event.link && (
            <div
              className="pointer-events-none absolute left-0 top-full mt-2 z-50 w-72 rounded-xl bg-popover border border-border shadow-xl p-3 opacity-0 group-hover/title-wrap:opacity-100 transition-opacity duration-200 [@media(hover:none)]:hidden"
              role="tooltip"
            >
              <div className="flex items-center gap-1.5 text-primary font-semibold text-xs mb-1.5">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                {safeFormat(event.date, "MMM d, yyyy")}
                {isIsoDate(event.date) && (
                  <span className="text-muted-foreground font-normal">· {safeFormat(event.date, "h:mm a")}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-2">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-secondary" />
                <span>{event.venue}</span>
              </div>
              {event.description && (
                <p className="text-muted-foreground text-xs leading-relaxed border-t border-border/60 pt-2">
                  {event.description.length > 100
                    ? event.description.slice(0, 100) + "…"
                    : event.description}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <MapPin className="w-4 h-4 shrink-0 text-secondary" />
          <span className="font-medium">{event.venue}</span>
          {distanceMiles !== undefined && (
            <span className="ml-auto shrink-0 inline-flex items-center rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-semibold text-secondary">
              {distanceMiles.toFixed(1)} mi
            </span>
          )}
        </div>

        <p className="text-muted-foreground text-sm leading-relaxed mb-3 flex-1">
          {event.description}
        </p>

        {(event as any).source && (
          <p className="text-xs text-muted-foreground/60 italic mb-4 flex items-center gap-1.5">
            <span>via</span>
            {(() => {
              const src = (event as any).source as string;
              const href = event.link || SOURCE_URLS[src];
              let faviconDomain = "";
              try {
                faviconDomain = new URL(src.startsWith("http") ? src : SOURCE_URLS[src] || "").hostname;
              } catch { /* ignore */ }
              const favicon = faviconDomain
                ? `https://www.google.com/s2/favicons?domain=${faviconDomain}&sz=32`
                : src === "Eventbrite"
                  ? `https://www.google.com/s2/favicons?domain=eventbrite.com&sz=32`
                  : null;
              const label = SOURCE_URLS[src] ? src : src.startsWith("http") ? (() => { try { return new URL(src).hostname.replace(/^www\./, ""); } catch { return src; } })() : src;
              return (
                <>
                  {favicon && (
                    <img
                      src={favicon}
                      alt=""
                      className="w-4 h-4 rounded-[3px] inline-block align-middle shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 hover:text-primary transition-colors not-italic"
                    >
                      {label}
                    </a>
                  ) : (
                    label
                  )}
                </>
              );
            })()}
          </p>
        )}

        {digestId && (
          <RsvpBox
            digestId={digestId}
            eventTitle={event.title}
            eventDate={event.date}
            eventVenue={event.venue}
          />
        )}
      </div>
    </div>
  );
}
