import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Star } from "lucide-react";

import { useLatestDigest } from "@/hooks/use-events";
import { Layout } from "@/components/layout";
import { EventCard } from "@/components/event-card";
import { SubscribeForm } from "@/components/subscribe-form";
import { useTenant } from "@/contexts/tenant-context";

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
  if (cat === "wellness" || cat === "meditation" || cat === "mindfulness" || cat === "yoga" || cat === "health") return "Wellness";
  if (cat === "civics" || cat === "civic" || cat === "community" || cat === "government" || cat === "policy") return "Civics";
  if (cat === "arts" || cat === "art" || cat === "music" || cat === "culture" || cat === "entertainment") return "Arts";
  if (cat === "sports" || cat === "fitness" || cat === "outdoors") return "Sports";
  if (cat === "tech" || cat === "technology" || cat === "business") return "Tech";
  const titleOnly = (event.title || "").toLowerCase();
  if (titleOnly.includes("tech") || titleOnly.includes("business") || titleOnly.includes("startup") || titleOnly.includes("ai ")) return "Tech";
  if (titleOnly.includes("fitness") || titleOnly.includes("yoga") || titleOnly.includes("hike") || titleOnly.includes("sport")) return "Sports";
  return "Arts";
}

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

export default function Home() {
  const { data: latestDigestRes, isLoading: isLoadingLatest } = useLatestDigest();
  const tenant = useTenant();
  const [categoryFilter, setCategoryFilter] = useState<DisplayCat>("All");

  const latestDigest = latestDigestRes?.digest;
  const cityShortName = tenant.city.split(",")[0];

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

      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-background py-16 sm:py-24 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--color-primary)_0%,transparent_40%)] opacity-5" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary font-medium text-sm mb-6 border border-secondary/20">
                <Sparkles className="w-4 h-4" />
                <span>The best of {cityShortName}, hand-picked for you</span>
              </div>
              
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold font-serif text-balance text-foreground mb-6 leading-[1.1]">
                Stop scrolling. <br/>
                Start <span className="text-primary italic">experiencing</span> {cityShortName}.
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground mb-10 leading-relaxed max-w-xl">
                Every Monday, a curated list of the best live music, food pop-ups, tech meetups, and hidden gems happening in {cityShortName} this week. Carpooling functionality will be enabled with your trusted network!
              </p>

              <div id="subscribe" className="bg-card p-6 rounded-2xl shadow-xl shadow-black/5 border border-border/60 scroll-mt-24">
                <SubscribeForm />
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative hidden lg:block"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-secondary/20 to-accent/20 rounded-3xl transform rotate-3 scale-105" />
              <img 
                src={`${import.meta.env.BASE_URL}images/austin-hero.png`} 
                alt="Austin Texas stylized illustration" 
                className="relative rounded-3xl shadow-2xl border border-border object-cover aspect-[4/3] w-full"
              />
            </motion.div>

          </div>
        </div>
      </section>

      {/* LATEST DIGEST PREVIEW */}
      <section className="py-20 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div className="max-w-2xl">
              <h2 className="font-serif text-4xl font-bold mb-4">Inside the Latest Issue</h2>
              <p className="text-muted-foreground text-lg">
                A sneak peek at what subscribers received this week.
              </p>
            </div>
            {latestDigest && (
              <Link 
                href={`/digest/${latestDigest.id}`}
                className="inline-flex items-center gap-2 text-primary font-semibold hover:text-primary/80 transition-colors group"
              >
                Read full edition
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
            )}
          </div>

          {/* Category Filter Bar */}
          {latestDigest?.events && (
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
          )}

          {isLoadingLatest ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-96 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : latestDigest?.events ? (
            (() => {
              const upcomingEvents = latestDigest.events.filter((e: any) => e.featured || isEventTodayOrLater(e.date));
              const visibleEvents = categoryFilter === "All"
                ? upcomingEvents
                : upcomingEvents.filter((e: any) => getDisplayCategory(e) === categoryFilter);
              const featuredEvents = visibleEvents.filter((e: any) => e.featured);
              const regularEvents = visibleEvents.filter((e: any) => !e.featured);
              return (
                <div className="space-y-8">
                  {featuredEvents.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                    >
                      <div className="relative rounded-3xl border-2 border-amber-400/60 bg-gradient-to-br from-amber-50/80 via-card to-card dark:from-amber-950/30 shadow-lg shadow-amber-100/40 dark:shadow-amber-900/20 overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />
                        <div className="absolute top-4 right-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-amber-400 text-amber-950 shadow-sm">
                            <Star className="w-3 h-3 fill-amber-950" />
                            Special Event
                          </span>
                        </div>
                        <div className="p-6 sm:p-8">
                          <div className="max-w-xl">
                            <EventCard event={featuredEvents[0]} digestId={latestDigest.id} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {regularEvents.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {regularEvents.slice(0, featuredEvents.length > 0 ? 2 : 3).map((event, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.1 }}
                        >
                          <EventCard event={event} digestId={latestDigest.id} />
                        </motion.div>
                      ))}
                    </div>
                  ) : featuredEvents.length === 0 ? (
                    <div className="text-center py-16 bg-muted/30 rounded-3xl border border-dashed border-border">
                      <p className="text-4xl mb-3">{CAT_CONFIG[categoryFilter].emoji}</p>
                      <p className="text-lg font-serif font-bold text-foreground mb-2">No {CAT_CONFIG[categoryFilter].label} events this week</p>
                      <p className="text-muted-foreground text-sm">Check back next issue for {categoryFilter.toLowerCase()} events.</p>
                    </div>
                  ) : null}
                </div>
              );
            })()
          ) : (
            <div className="text-center py-20 bg-muted/30 rounded-3xl border border-dashed border-border">
              <p className="text-muted-foreground">No events found for this week yet.</p>
            </div>
          )}
        </div>
      </section>

    </Layout>
  );
}
