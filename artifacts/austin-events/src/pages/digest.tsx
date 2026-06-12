import { useRoute } from "wouter";
import { Layout } from "@/components/layout";
import { EventCard } from "@/components/event-card";
import { useAllDigests, useLatestDigest } from "@/hooks/use-events";
import { format, parseISO } from "date-fns";
import { Calendar, ArrowLeft, Star } from "lucide-react";
import { Link } from "wouter";
import { SubscribeForm } from "@/components/subscribe-form";

const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function isEventTodayOrLater(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const match = dateStr.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})/i);
  if (!match) return true;
  const key = match[1].substring(0, 3);
  const month = MONTH_MAP[key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()];
  if (month === undefined) return true;
  const day = parseInt(match[2], 10);
  const eventDate = new Date(today.getFullYear(), month, day);
  return eventDate >= today;
}

function getEventDateRange(events: any[]): string {
  const dates: Date[] = [];
  for (const e of events) {
    const match = (e.date || "").match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})/i);
    if (!match) continue;
    const key = match[1].substring(0, 3);
    const month = MONTH_MAP[key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()];
    if (month === undefined) continue;
    dates.push(new Date(new Date().getFullYear(), month, parseInt(match[2], 10)));
  }
  if (dates.length === 0) return "";
  dates.sort((a, b) => a.getTime() - b.getTime());
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const min = dates[0];
  const max = dates[dates.length - 1];
  const year = max.getFullYear();
  if (min.getTime() === max.getTime()) return `${fmt(min)}, ${year}`;
  return `${fmt(min)} – ${fmt(max)}, ${year}`;
}

function parseEventDateForSort(dateStr: string): number {
  // Handles: "Sunday, Jun 7", "Wednesday, Jun 10 at 7:00 AM", "Thu, Jun 11 - Fri, Jun 12"
  const match = dateStr.match(/([A-Z][a-z]{2})\s+(\d+)/);
  if (!match) return 0;
  const month = MONTH_MAP[match[1]] ?? 0;
  const day = parseInt(match[2], 10);
  // Extract time if present (e.g. "at 7:00 AM")
  const timeMatch = dateStr.match(/at\s+(\d+):(\d+)\s*(AM|PM)/i);
  let hours = 0;
  let minutes = 0;
  if (timeMatch) {
    hours = parseInt(timeMatch[1], 10);
    minutes = parseInt(timeMatch[2], 10);
    if (timeMatch[3].toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (timeMatch[3].toUpperCase() === "AM" && hours === 12) hours = 0;
  }
  // Use 1440 (minutes/day) so any within-day time never outweighs a day difference
  return month * 46080 + day * 1440 + hours * 60 + minutes;
}

export default function DigestView() {
  const [match, params] = useRoute("/digest/:id");
  const idStr = params?.id;
  const isLatest = idStr === "latest";
  
  const { data: latestData, isLoading: loadingLatest } = useLatestDigest();
  const { data: allData, isLoading: loadingAll } = useAllDigests();

  const isLoading = isLatest ? loadingLatest : loadingAll;
  
  let digest = null;
  if (isLatest && latestData?.digest) {
    digest = latestData.digest;
  } else if (idStr && allData?.digests) {
    digest = allData.digests.find(d => d.id === parseInt(idStr));
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-20">
          <div className="h-8 w-32 bg-muted rounded mb-8 animate-pulse" />
          <div className="h-16 w-3/4 bg-muted rounded mb-6 animate-pulse" />
          <div className="h-32 w-full bg-muted rounded mb-12 animate-pulse" />
          <div className="grid gap-8">
            {[1, 2, 3].map(i => <div key={i} className="h-64 w-full bg-muted rounded-2xl animate-pulse" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (!digest) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-32 text-center">
          <h1 className="text-4xl font-serif font-bold mb-4 text-foreground">Digest not found</h1>
          <p className="text-muted-foreground mb-8 text-lg">We couldn't find the edition you're looking for.</p>
          <Link href="/" className="text-primary font-medium hover:underline inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <article className="max-w-4xl mx-auto px-4 sm:px-6 py-12 lg:py-20">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-10 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to all editions
        </Link>
        
        <header className="mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-6">
            <Calendar className="w-4 h-4" />
            <span>{(() => {
              const upcoming = digest.events.filter((e: any) => isEventTodayOrLater(e.date));
              const range = getEventDateRange(upcoming);
              return range ? `Events: ${range}` : `Week of ${format(parseISO(digest.weekOf.substring(0, 10)), "MMMM d, yyyy")}`;
            })()}</span>
          </div>
          
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] mb-8">
            {(() => {
              const upcoming = digest.events.filter((e: any) => isEventTodayOrLater(e.date));
              const range = getEventDateRange(upcoming);
              if (!range) return digest.subject;
              // Extract leading emoji if present
              const emojiMatch = digest.subject.match(/^(\p{Emoji_Presentation}[\p{Emoji}\uFE0F\u200D]*\s*)/u);
              const emoji = emojiMatch ? emojiMatch[1] : "";
              return `${emoji}Austin Events: ${range}`;
            })()}
          </h1>
          
          <div className="prose prose-lg prose-p:text-muted-foreground prose-p:leading-relaxed max-w-none bg-card p-8 rounded-3xl border border-border shadow-sm">
            <p className="whitespace-pre-wrap">{digest.intro}</p>
          </div>
        </header>

        {(() => {
          const upcomingEvents = digest.events.filter((e: any) => isEventTodayOrLater(e.date));
          const featuredEvents = upcomingEvents.filter((e: any) => e.featured);
          const regularEvents = [...upcomingEvents]
            .filter((e: any) => !e.featured)
            .sort((a, b) => parseEventDateForSort(a.date) - parseEventDateForSort(b.date));
          return (
            <>
              {featuredEvents.length > 0 && (
                <section className="mb-12">
                  <h2 className="font-serif text-3xl font-bold mb-8 flex items-center gap-3">
                    <span className="w-8 h-1 bg-amber-500 rounded-full"></span>
                    <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                    Featured Event
                  </h2>
                  <div className="relative rounded-3xl border-2 border-amber-400/60 bg-gradient-to-br from-amber-50/80 via-card to-card dark:from-amber-950/30 shadow-lg shadow-amber-100/40 dark:shadow-amber-900/20 overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />
                    <div className="absolute top-4 right-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-amber-400 text-amber-950 shadow-sm">
                        <Star className="w-3 h-3 fill-amber-950" />
                        Special Event
                      </span>
                    </div>
                    <div className="p-6 sm:p-8">
                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-4 uppercase tracking-wider">
                        Outside this week's dates — don't miss it!
                      </p>
                      <EventCard event={featuredEvents[0]} digestId={digest.id} />
                    </div>
                  </div>
                </section>
              )}

              <section>
                <h2 className="font-serif text-3xl font-bold mb-8 flex items-center gap-3">
                  <span className="w-8 h-1 bg-primary rounded-full"></span>
                  This Week's Curated Events
                </h2>
                <div className="grid sm:grid-cols-2 gap-8">
                  {regularEvents.map((event, i) => (
                    <EventCard key={i} event={event} digestId={digest.id} />
                  ))}
                </div>
              </section>
            </>
          );
        })()}

        <section id="subscribe" className="mt-24 p-10 bg-secondary rounded-3xl text-secondary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--color-primary)_0%,transparent_70%)] opacity-20" />
          <div className="relative z-10">
            <h3 className="font-serif text-3xl font-bold mb-2 text-center">Don't miss the next one</h3>
            <p className="text-secondary-foreground/80 mb-8 max-w-lg mx-auto text-lg text-center">
              Get next week's best Austin events delivered straight to your inbox.
            </p>
            <div className="max-w-xl mx-auto bg-card p-6 rounded-2xl shadow-xl shadow-black/5 border border-border/60">
              <SubscribeForm />
            </div>
          </div>
        </section>
      </article>
    </Layout>
  );
}
