import { useState, useEffect } from "react";
import { Calendar, MapPin, ExternalLink, Music, Utensils, Laptop, Ticket, Car, CheckCircle2, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { EventItem } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  const [checked, setChecked] = useState(rsvpd);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">(rsvpd ? "done" : "idle");
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (digestId && eventTitle) {
      fetch(`/api/rsvp?digestId=${digestId}&eventTitle=${encodeURIComponent(eventTitle)}`)
        .then(r => r.json())
        .then(data => setCount(data.count ?? 0))
        .catch(() => {});
    }
  }, [digestId, eventTitle]);

  const handleCheck = () => {
    if (status === "done") return;
    setChecked(true);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("submitting");
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digestId, eventTitle, email, name: name || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("done");
        setShowForm(false);
        setCount(data.count);
        markRsvpd();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="mt-auto pt-4 border-t border-border/50">
      {status === "done" ? (
        <div className="flex items-center gap-2 text-primary text-sm font-medium">
          <CheckCircle2 className="w-4 h-4" />
          You're interested in carpooling!
          {count && count > 1 && <span className="text-muted-foreground font-normal">({count} total)</span>}
        </div>
      ) : (
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer group select-none">
            <div
              onClick={handleCheck}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0
                ${checked ? "bg-primary border-primary" : "border-border group-hover:border-primary/60"}`}
            >
              {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
            </div>
            <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Car className="w-4 h-4 text-primary" />
              Interested in carpooling?
            </span>
          </label>

          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-2 pl-8">
              <Input
                type="text"
                placeholder="Your name (optional)"
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-9 text-sm rounded-lg"
              />
              <Input
                type="email"
                placeholder="Your email *"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="h-9 text-sm rounded-lg"
              />
              <Button
                type="submit"
                size="sm"
                disabled={status === "submitting" || !email}
                className="w-full rounded-lg h-9 text-sm"
              >
                {status === "submitting"
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Submitting…</>
                  : "Yes, I'm interested!"}
              </Button>
              {status === "error" && <p className="text-xs text-destructive">Something went wrong. Try again.</p>}
              {count !== null && count > 0 && (
                <p className="text-xs text-muted-foreground">{count} {count === 1 ? "person" : "people"} already interested</p>
              )}
            </form>
          )}
        </div>
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

        <p className="text-muted-foreground text-sm leading-relaxed mb-4 flex-1 line-clamp-3">
          {event.description}
        </p>

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
