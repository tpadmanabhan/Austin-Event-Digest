import { Calendar, MapPin, ExternalLink, Music, Utensils, Laptop, Ticket } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { EventItem } from "@workspace/api-client-react";

export function EventCard({ event }: { event: EventItem }) {
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
              {format(parseISO(event.date), "MMM d, yyyy")}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              {format(parseISO(event.date), "h:mm a")}
            </span>
          </div>
        </div>

        <h3 className="font-serif text-2xl font-bold leading-tight text-foreground mb-3 line-clamp-2">
          {event.title}
        </h3>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <MapPin className="w-4 h-4 shrink-0 text-secondary" />
          <span className="font-medium">{event.venue}</span>
        </div>

        <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-1 line-clamp-3">
          {event.description}
        </p>

        {event.link && (
          <div className="mt-auto pt-4 border-t border-border/50">
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
      </div>
    </div>
  );
}
