import { useState } from "react";
import { useRoute } from "wouter";
import { Layout } from "@/components/layout";
import { EventCard } from "@/components/event-card";
import { useAllDigests, useLatestDigest } from "@/hooks/use-events";
import { format, parseISO } from "date-fns";
import { Calendar, ArrowLeft, Star, Leaf, ExternalLink, Trophy } from "lucide-react";
import { Link } from "wouter";
import { SubscribeForm } from "@/components/subscribe-form";
import { useTenant } from "@/contexts/tenant-context";

const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function isEventTodayOrLater(dateStr: string, event?: any): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (event?.dailyUntil) {
    const until = new Date(event.dailyUntil + "T00:00:00");
    return until >= today;
  }
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

function getWeekMFDateRange(weekOfStr: string): string {
  const sunday = parseISO(weekOfStr.substring(0, 10));
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  const year = saturday.getFullYear();
  if (sunday.getMonth() === saturday.getMonth()) {
    return `${format(sunday, "MMMM")} ${sunday.getDate()}–${saturday.getDate()}, ${year}`;
  }
  return `${format(sunday, "MMMM d")} – ${format(saturday, "MMMM d")}, ${year}`;
}

type DisplayCat = "All" | "Tech" | "Arts" | "Sports" | "Civics" | "Wellness";

const CAT_CONFIG: Record<DisplayCat, { label: string; emoji: string }> = {
  All:     { label: "All Events", emoji: "✦" },
  Tech:    { label: "Tech",       emoji: "💻" },
  Arts:    { label: "Arts",       emoji: "🎨" },
  Sports:  { label: "Sports",     emoji: "🏃" },
  Civics:  { label: "Civics",     emoji: "🏛️" },
  Wellness:{ label: "Wellness",   emoji: "🧘" },
};

function getDisplayCategory(event: { category: string; title: string; description?: string }): "Tech" | "Arts" | "Sports" | "Civics" | "Wellness" {
  const cat = (event.category || "").toLowerCase().trim();
  // Handle both new single-word values and legacy multi-word stored values
  if (cat.includes("tech") || cat.includes("business") || cat.includes("startup")) return "Tech";
  if (cat.includes("wellness") || cat.includes("meditation") || cat.includes("mindfulness") || cat.includes("yoga") || cat.includes("pilates")) return "Wellness";
  if (cat.includes("sports") || cat.includes("fitness") || cat.includes("outdoor") || cat.includes("sport")) return "Sports";
  if (cat.includes("civics") || cat.includes("civic") || cat.includes("community") || cat.includes("volunteer") || cat.includes("nonprofit")) return "Civics";
  if (cat.includes("arts") || cat.includes("music") || cat.includes("culture") || cat.includes("entertainment") || cat.includes("food") || cat.includes("learning")) return "Arts";
  // Title-based fallbacks
  const titleOnly = (event.title || "").toLowerCase();
  if (titleOnly.includes("tech") || titleOnly.includes("startup") || titleOnly.includes("ai ") || titleOnly.includes("coding") || titleOnly.includes("forum")) return "Tech";
  if (titleOnly.includes("yoga") || titleOnly.includes("meditation") || titleOnly.includes("wellness")) return "Wellness";
  if (titleOnly.includes("fitness") || titleOnly.includes("hike") || titleOnly.includes("sport") || titleOnly.includes("cycling") || titleOnly.includes("swim")) return "Sports";
  if (titleOnly.includes("volunteer") || titleOnly.includes("community") || titleOnly.includes("nonprofit")) return "Civics";
  return "Arts";
}

function parseEventDateForSort(dateStr: string): number {
  // Handles: "Sunday, Jun 7", "Wednesday, Jun 10 at 7:00 AM", "Thu, Jun 11 - Fri, Jun 12"
  const match = dateStr.match(/([A-Z][a-z]{2})\s+(\d+)/);
  if (!match) return 0;
  const month = MONTH_MAP[match[1]] ?? 0;
  const day = parseInt(match[2], 10);
  // Extract time if present (e.g. "at 7:00 AM" or ", 7:00 PM")
  const timeMatch = dateStr.match(/(?:at\s+|,\s*)(\d+):(\d+)\s*(AM|PM)/i);
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
  const tenant = useTenant();
  const cityShortName = tenant.city.split(",")[0];
  const isAustinCares = tenant.slug === "brushycreek";
  const isPortland = tenant.slug === "portland";
  
  const { data: latestData, isLoading: loadingLatest } = useLatestDigest();
  const { data: allData, isLoading: loadingAll } = useAllDigests();

  const isLoading = isLatest ? loadingLatest : loadingAll;
  const [categoryFilter, setCategoryFilter] = useState<DisplayCat>("All");

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
      {/* ANNOUNCEMENT BANNER */}
      <div className="bg-primary/10 border-b border-primary/20 py-2.5 px-4 text-center text-sm">
        <span className="font-semibold text-primary">Coming Soon:</span>{" "}
        <span className="text-foreground/80">Become the events and carpooling person for your city or neighborhood:</span>{" "}
        <a href="https://eventcarpooling.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2 hover:opacity-80">
          eventcarpooling.com
        </a>
      </div>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 py-12 lg:py-20">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-10 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to all editions
        </Link>
        
        <header className="mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-6">
            <Calendar className="w-4 h-4" />
            <span>{`Events: ${getWeekMFDateRange(digest.weekOf)}`}</span>
          </div>
          
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] mb-8">
            {(() => {
              const range = getWeekMFDateRange(digest.weekOf);
              const emojiMatch = digest.subject.match(/^(\p{Emoji_Presentation}[\p{Emoji}\uFE0F\u200D]*\s*)/u);
              const emoji = emojiMatch ? emojiMatch[1] : "";
              const titleBase = tenant.digestTitle || `${cityShortName} Events`;
              return `${emoji}${titleBase}: ${range}`;
            })()}
          </h1>
          
          <div className="prose prose-lg prose-p:text-muted-foreground prose-p:leading-relaxed max-w-none bg-card p-8 rounded-3xl border border-border shadow-sm">
            <p className="whitespace-pre-wrap">
              {digest.intro.split(/(zodiac signs)/i).map((part, i) =>
                /zodiac signs/i.test(part) ? (
                  <a key={i} href="https://www.astrology.com/zodiac-signs" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-70 transition-opacity">{part}</a>
                ) : part
              )}
            </p>
            <p className="mt-3 text-sm font-semibold text-primary not-italic">
              —{" "}
              {isAustinCares ? (
                <span className="inline-flex items-center gap-1.5">
                  Rohan
                  <img src="https://flagcdn.com/20x15/fr.png" srcSet="https://flagcdn.com/40x30/fr.png 2x" width={20} height={15} alt="France flag" className="inline-block rounded-[2px] align-middle" />
                  <img src="https://flagcdn.com/20x15/us.png" srcSet="https://flagcdn.com/40x30/us.png 2x" width={20} height={15} alt="United States flag" className="inline-block rounded-[2px] align-middle" />
                </span>
              ) : isPortland ? (
                <a href="https://www.minervaventures.com/what-we-do" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">Marianna</a>
              ) : (
                "Bob"
              )}
            </p>
          </div>
        </header>

        {/* Category Filter Bar */}
        <div className="mb-10">
          <div className="flex items-center gap-2 flex-wrap">
            {(Object.keys(CAT_CONFIG) as DisplayCat[]).map(cat => {
              const cfg = CAT_CONFIG[cat];
              const isActive = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  <span>{cfg.emoji}</span>
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {(() => {
          const communityPosts = digest.events.filter((e: any) => e.isPost === true);
          const businessSpotlights = digest.events.filter((e: any) => e.isBusinessSpotlight === true);
          const upcomingEvents = digest.events.filter((e: any) =>
            !e.isPost &&
            !e.isBusinessSpotlight &&
            (e.featured || isEventTodayOrLater(e.date, e))
          );
          const visibleEvents = categoryFilter === "All"
            ? upcomingEvents
            : upcomingEvents.filter((e: any) => {
                const cats: string[] = e.categories ?? [];
                if (cats.length > 0) return cats.includes(categoryFilter);
                return getDisplayCategory(e) === categoryFilter;
              });
          const featuredEvents = visibleEvents.filter((e: any) => e.featured);
          const regularEvents = [...visibleEvents]
            .filter((e: any) => !e.featured)
            .sort((a, b) => parseEventDateForSort(a.date) - parseEventDateForSort(b.date));

          return (
            <>
              <section className="mb-12">
                <h2 className="font-serif text-3xl font-bold mb-4 flex items-center gap-3">
                  <span className="w-8 h-1 bg-primary rounded-full"></span>
                  🌎 The Rise of IRL
                </h2>
                <div className="rounded-2xl border border-border bg-card p-6 space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    In Real Life (IRL) events are having a moment — and it's not just nostalgia. As screens dominate more of our attention, people are craving genuine face-to-face connection more than ever. From neighborhood meetups to multi-day conferences, IRL gatherings are reshaping how communities form, how professionals network, and how ideas spread. The shift is changing everyday life in ways that online spaces simply can't replicate.
                  </p>
                  <ul className="space-y-2 pt-1">
                    <li>
                      <a href="https://influencerdaily.com/irl-events-redefine-community-building/" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2 hover:opacity-70 transition-opacity">
                        IRL Events Redefine Community Building in the Creator Economy
                      </a>
                      <span className="text-xs text-muted-foreground/60 ml-1">— Influencer Daily</span>
                    </li>
                    <li>
                      <a href="https://www.forbes.com/sites/brucelee/2026/01/25/trend-towards-irl-events-with-more-authenticity-whats-behind-it/" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2 hover:opacity-70 transition-opacity">
                        Trend Towards IRL Events With More Authenticity: What's Behind It?
                      </a>
                      <span className="text-xs text-muted-foreground/60 ml-1">— Forbes</span>
                    </li>
                    <li>
                      <a href="https://tech.yahoo.com/ai/articles/ai-industrys-hottest-networking-event-095252785.html" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2 hover:opacity-70 transition-opacity">
                        The AI Industry's Hottest Networking Event Is a Dinner Party
                      </a>
                      <span className="text-xs text-muted-foreground/60 ml-1">— Yahoo Tech</span>
                    </li>
                  </ul>
                </div>
              </section>

              {featuredEvents.length > 0 && (
                <section className="mb-12">
                  <h2 className="font-serif text-3xl font-bold mb-8 flex items-center gap-3">
                    <span className="w-8 h-1 bg-amber-500 rounded-full"></span>
                    <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                    Special Events
                  </h2>
                  <div className="flex flex-col gap-6">
                    {featuredEvents.map((featEvent: any, fi: number) => (
                      <div key={fi} className="relative rounded-3xl border-2 border-amber-400/60 bg-gradient-to-br from-amber-50/80 via-card to-card dark:from-amber-950/30 shadow-lg shadow-amber-100/40 dark:shadow-amber-900/20">
                        <div className="h-1 rounded-t-3xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />
                        <div className="p-6 sm:p-8">
                          <div className="flex justify-end mb-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-amber-400 text-amber-950 shadow-sm">
                              <Star className="w-3 h-3 fill-amber-950" />
                              Special Event
                            </span>
                          </div>
                          <EventCard event={featEvent} digestId={digest.id} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {categoryFilter === "All" && businessSpotlights.length > 0 && (
                <section className="mb-12">
                  <h2 className="font-serif text-3xl font-bold mb-8 flex items-center gap-3">
                    <span className="w-8 h-1 bg-sky-500 rounded-full"></span>
                    <Trophy className="w-6 h-6 text-sky-500" />
                    Business Spotlight
                  </h2>
                  <div className="flex flex-col gap-6">
                    {businessSpotlights.map((biz: any, bi: number) => (
                      <div key={bi} className="relative rounded-3xl border-2 border-sky-400/60 bg-gradient-to-br from-sky-50/80 via-card to-card dark:from-sky-950/30 shadow-lg shadow-sky-100/40 dark:shadow-sky-900/20">
                        <div className="h-1 rounded-t-3xl bg-gradient-to-r from-sky-400 via-cyan-300 to-sky-400" />
                        <div className="p-6 sm:p-8">
                          <div className="flex justify-end mb-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-sky-500 text-white shadow-sm">
                              🎾 Business Spotlight
                            </span>
                          </div>
                          <h3 className="font-serif text-xl font-bold text-foreground mb-3">{biz.title}</h3>
                          {biz.description && (
                            <p className="text-muted-foreground leading-relaxed mb-4 whitespace-pre-wrap">{biz.description}</p>
                          )}
                          {biz.link && (
                            <div className="mt-2">
                              <a
                                href={biz.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
                                style={{ background: "linear-gradient(135deg, #0284c7, #38bdf8)", boxShadow: "0 4px 14px rgba(2,132,199,0.35)" }}
                              >
                                Visit Website <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {categoryFilter === "All" && communityPosts.length > 0 && (
                <section className="mb-12">
                  <h2 className="font-serif text-3xl font-bold mb-8 flex items-center gap-3">
                    <span className="w-8 h-1 bg-green-500 rounded-full"></span>
                    <Leaf className="w-6 h-6 text-green-500" />
                    Community Spotlight
                  </h2>
                  <div className="flex flex-col gap-6">
                    {communityPosts.map((post: any, pi: number) => (
                      <div key={pi} className="relative rounded-3xl border-2 border-green-400/60 bg-gradient-to-br from-green-50/80 via-card to-card dark:from-green-950/30 shadow-lg shadow-green-100/40 dark:shadow-green-900/20">
                        <div className="h-1 rounded-t-3xl bg-gradient-to-r from-green-400 via-emerald-300 to-green-400" />
                        <div className="p-6 sm:p-8">
                          <div className="flex justify-end mb-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-green-500 text-white shadow-sm">
                              <Leaf className="w-3 h-3" />
                              Community Post
                            </span>
                          </div>
                          <h3 className="font-serif text-xl font-bold text-foreground mb-3">{post.title}</h3>
                          {post.description && (
                            <p className="text-muted-foreground leading-relaxed mb-4">{post.description}</p>
                          )}
                          {post.deadline && (
                            <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
                              <Calendar className="w-3.5 h-3.5" />
                              Apply by {post.deadline}
                            </div>
                          )}
                          {post.link && (
                            <div className="mt-2">
                              <a
                                href={post.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
                                style={{ background: "linear-gradient(135deg, #16a34a, #22c55e)", boxShadow: "0 4px 14px rgba(22,163,74,0.35)" }}
                              >
                                Apply Now <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h2 className="font-serif text-3xl font-bold mb-8 flex items-center gap-3">
                  <span className="w-8 h-1 bg-primary rounded-full"></span>
                  This Week's Curated Events
                </h2>
                {visibleEvents.length === 0 ? (
                  <div className="text-center py-16 bg-muted/40 rounded-3xl border border-border">
                    <p className="text-4xl mb-4">{CAT_CONFIG[categoryFilter].emoji}</p>
                    <p className="text-xl font-serif font-bold text-foreground mb-2">No {categoryFilter} events this week</p>
                    <p className="text-muted-foreground text-sm mb-6">Check back next issue for {categoryFilter.toLowerCase()} events.</p>
                    <button
                      onClick={() => setCategoryFilter("All")}
                      className="text-primary text-sm font-medium hover:underline"
                    >
                      View all events →
                    </button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-8">
                    {regularEvents.map((event, i) => (
                      <EventCard key={i} event={event} digestId={digest.id} />
                    ))}
                  </div>
                )}
              </section>
            </>
          );
        })()}

        <section id="subscribe" className="mt-24 p-10 bg-secondary rounded-3xl text-secondary-foreground relative overflow-hidden scroll-mt-24">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--color-primary)_0%,transparent_70%)] opacity-20" />
          <div className="relative z-10">
            <h3 className="font-serif text-3xl font-bold mb-2 text-center">Don't miss the next one</h3>
            <p className="text-secondary-foreground/80 mb-8 max-w-lg mx-auto text-lg text-center">
              Get next week's best {cityShortName} events delivered straight to your inbox.
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
