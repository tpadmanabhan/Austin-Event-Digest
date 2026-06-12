import { useState, useEffect } from "react";
import { Calendar, MapPin, ExternalLink, Music, Utensils, Laptop, Ticket, Car, CheckCircle2, Loader2 } from "lucide-react";
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

  if (status === "done") {
    return (
      <div className="mt-auto pt-4 border-t border-border/50">
        <div className="flex items-center gap-2 text-primary text-sm font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>
            {confirmedName ? `You're in, ${confirmedName}! 🚗` : "You're in! 🚗"}
            <span className="font-normal text-muted-foreground ml-1">Other subscribers have been notified.</span>
          </span>
        </div>
        {count && count > 1 && (
          <p className="text-xs text-muted-foreground mt-1 pl-6">{count} people interested in carpooling</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-auto pt-4 border-t border-border/50">
      {!showForm ? (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Car className="w-4 h-4 text-primary" />
            Want to carpool?
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm(true)}
            className="rounded-lg h-8 text-sm border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground"
          >
            Yes!
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
            <Car className="w-3.5 h-3.5 text-primary" /> Carpool RSVP — other subscribers will be notified
          </p>
          <Input
            type="text"
            placeholder="Your first name *"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            required
            className="h-9 text-sm rounded-lg"
            autoFocus
          />
          <Input
            type="email"
            placeholder="Your email *"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="h-9 text-sm rounded-lg"
          />
          <TurnstileWidget
            onSuccess={setCaptchaToken}
            onError={() => setCaptchaToken(null)}
            onExpire={() => setCaptchaToken(null)}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => { setShowForm(false); setCaptchaToken(null); }}
              className="rounded-lg h-9 text-sm flex-shrink-0"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={status === "submitting" || !email || !firstName.trim() || !captchaToken}
              className="w-full rounded-lg h-9 text-sm"
            >
              {status === "submitting"
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />Sending…</>
                : "Send Carpool Alert 🚗"}
            </Button>
          </div>
          {status === "error" && <p className="text-xs text-destructive">Something went wrong. Please try again.</p>}
          {count !== null && count > 0 && (
            <p className="text-xs text-muted-foreground">{count} {count === 1 ? "person" : "people"} already interested</p>
          )}
        </form>
      )}
    </div>
  );
}

export function EventCard({ event, digestId }: { event: EventItem; digestId?: number }) {
  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("music") || cat.includes("concert")) return <Music className="w-4 h-4" />;
    if (cat.includes("food") || cat.includes("dining")) return <Utensils className="w-4 h-4" />;
    if (cat.includes("tech") || cat.includes("startup")) return <Laptop className="w-4 h-4" />;
    return <Ticket className="w-4 h-4" />;
  };

  const getCategoryColor = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("music")) return "bg-accent/20 text-accent-foreground border-accent/30";
    if (cat.includes("food")) return "bg-primary/10 text-primary border-primary/20";
    if (cat.includes("tech")) return "bg-secondary/10 text-secondary border-secondary/20";
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-card border border-border shadow-sm transition-all duration-300 hover:shadow-xl hover:border-primary/30 hover:-translate-y-1 h-full">
      {event.imageUrl && (
        <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}
      
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${getCategoryColor(event.category)}`}>
            {getCategoryIcon(event.category)}
            {event.category}
          </span>
          <div className="flex flex-col items-end text-right">
            <span className="text-sm font-bold text-primary flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {safeFormat(event.date, "MMM d, yyyy")}
            </span>
            {isIsoDate(event.date) && (
              <span className="text-xs text-muted-foreground mt-1">
                {safeFormat(event.date, "h:mm a")}
              </span>
            )}
          </div>
        </div>

        <h3 className="font-serif text-2xl font-bold leading-tight text-foreground mb-3 line-clamp-2">
          {event.title}
        </h3>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <MapPin className="w-4 h-4 shrink-0 text-secondary" />
          <span className="font-medium">{event.venue}</span>
        </div>

        <p className="text-muted-foreground text-sm leading-relaxed mb-3 flex-1">
          {event.description}
        </p>

        {(event as any).source && (
          <p className="text-xs text-muted-foreground/60 italic mb-4">
            via{" "}
            {(() => {
              const href = event.link || SOURCE_URLS[(event as any).source];
              return href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-primary transition-colors not-italic"
                >
                  {(event as any).source}
                </a>
              ) : (
                (event as any).source
              );
            })()}
          </p>
        )}

        {event.link && (
          <div className="pb-4">
            <a
              href={event.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80 group/link"
            >
              View Event Details
              <ExternalLink className="w-4 h-4 transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
            </a>
          </div>
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
