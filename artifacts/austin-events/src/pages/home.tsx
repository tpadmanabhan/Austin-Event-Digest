import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Star, Bell, CheckCircle2, Loader2, Trophy, ExternalLink, Leaf, Calendar } from "lucide-react";

import { useLatestDigest } from "@/hooks/use-events";
import { Layout } from "@/components/layout";
import { EventCard } from "@/components/event-card";
import { SubscribeForm } from "@/components/subscribe-form";
import { useTenant } from "@/contexts/tenant-context";
import { useLanguage } from "@/contexts/language-context";
import { JA } from "@/i18n/ja";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EventMap } from "@/components/event-map";

const SHOW_AUSTIN_CARES = false;

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
  if (titleOnly.includes("tech") || titleOnly.includes("startup") || titleOnly.includes("ai ") || titleOnly.includes("developer")) return "Tech";
  if (titleOnly.includes("yoga") || titleOnly.includes("meditation") || titleOnly.includes("wellness")) return "Wellness";
  if (titleOnly.includes("fitness") || titleOnly.includes("hike") || titleOnly.includes("sport") || titleOnly.includes("cycling")) return "Sports";
  if (titleOnly.includes("volunteer") || titleOnly.includes("community") || titleOnly.includes("nonprofit")) return "Civics";
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

function parseEventDateForSort(dateStr: string): number {
  if (!dateStr) return Infinity;
  const m = dateStr.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})(?:\s+at\s+(\d+):(\d+)\s*(AM|PM))?/i);
  if (!m) return Infinity;
  const key = m[1].substring(0, 3);
  const month = MONTH_MAP[key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()];
  if (month === undefined) return Infinity;
  const day = parseInt(m[2], 10);
  let hour = m[3] ? parseInt(m[3], 10) : 12;
  const min = m[4] ? parseInt(m[4], 10) : 0;
  const ampm = m[5]?.toUpperCase();
  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  return new Date(new Date().getFullYear(), month, day, hour, min).getTime();
}


export default function Home() {
  const { data: latestDigestRes, isLoading: isLoadingLatest } = useLatestDigest();
  const tenant = useTenant();
  const [categoryFilter, setCategoryFilter] = useState<DisplayCat>("All");
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [featureEmail, setFeatureEmail] = useState("");
  const [featureStatus, setFeatureStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [featureError, setFeatureError] = useState("");

  async function handleFeatureInterestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!featureEmail.trim()) return;
    setFeatureStatus("submitting");
    setFeatureError("");
    try {
      const res = await fetch("/api/newsletter/feature-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: featureEmail.trim() }),
      });
      if (!res.ok) {
        const data = await res.json() as { message?: string };
        setFeatureError(data.message || "Something went wrong. Please try again.");
        setFeatureStatus("error");
      } else {
        setFeatureStatus("done");
      }
    } catch {
      setFeatureError("Network error. Please try again.");
      setFeatureStatus("error");
    }
  }

  const latestDigest = latestDigestRes?.digest;
  const cityShortName = tenant.city.split(",")[0];
  const isAustinCares = tenant.slug === "brushycreek";
  const isPortland = tenant.slug === "portland";
  const isSacramento = tenant.slug === "sacramento";
  const isBulverde = tenant.slug === "bulverde";
  const isStLouis = tenant.slug === "stlouis";
  const isToky = tenant.slug === "tokyo";
  const { lang, translate } = useLanguage();
  const [homeTranslatedMap, setHomeTranslatedMap] = useState<Map<string, { title: string; description: string }>>(() => new Map());

  useEffect(() => {
    if (!isToky || lang !== "ja") return;
    const events: any[] = latestDigest?.events ?? [];
    const untranslated = events.filter((e: any) => e?.title && !homeTranslatedMap.has(e.title));
    if (!untranslated.length) return;
    const titles = untranslated.map((e: any) => e.title || "");
    const descs  = untranslated.map((e: any) => e.description || "");
    // Single batched call: titles first, then descriptions — avoids concurrent request failures
    translate([...titles, ...descs]).then(tAll => {
      const tTitles = tAll.slice(0, titles.length);
      const tDescs  = tAll.slice(titles.length);
      setHomeTranslatedMap(prev => {
        const next = new Map(prev);
        untranslated.forEach((e: any, i: number) => {
          next.set(e.title, { title: tTitles[i] || e.title, description: tDescs[i] || e.description });
        });
        return next;
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, isToky, latestDigest]);

  const translateEvent = (event: any) => {
    if (!isToky || lang !== "ja") return event;
    const t = homeTranslatedMap.get(event.title);
    return t ? { ...event, ...t } : event;
  };

  // Japanese helper: returns JA string when Tokyo+ja, else English
  const jt = (en: string, ja: string) => (isToky && lang === "ja") ? ja : en;
  const JA_CAT: Record<string, string> = { All: JA.catAll, Tech: JA.catTech, Arts: JA.catArts, Sports: JA.catSports, Civics: JA.catCivics, Wellness: JA.catWellness };
  const catLabel = (cat: string) => (isToky && lang === "ja") ? (JA_CAT[cat] ?? cat) : (CAT_CONFIG[cat as keyof typeof CAT_CONFIG]?.label ?? cat);

  const MAP_CENTERS: Record<string, [number, number]> = {
    austin:      [30.267, -97.743],
    austincares: [30.267, -97.743],
    brushycreek: [30.508, -97.679],
    bulverde:    [29.747, -98.446],
    portland:    [45.523, -122.676],
    sacramento:  [38.575, -121.479],
    stlouis:     [38.627, -90.197],
    tokyo:       [35.676,  139.650],
  };
  const showMap = tenant.slug in MAP_CENTERS;
  const mapCenter: [number, number] = MAP_CENTERS[tenant.slug] ?? [30.267, -97.743];
  const heroImage = isAustinCares
    ? "brushycreek-hero.jpg"
    : tenant.slug === "austincares"
      ? "austincares-hero.svg"
      : isPortland
        ? "portland-hero.jpg"
        : isSacramento
          ? "sacramento-hero.jpg"
          : isBulverde
            ? "bulverde-hero.jpg"
            : isStLouis
              ? "stlouis-hero.jpg"
              : "austin-hero.png";
  const heroSrc = isToky
    ? "https://images.unsplash.com/photo-1480796927426-f609979314bd?w=1400&auto=format&fit=crop&q=80"
    : tenant.hasHeroImage
      ? `/api/tenant/image/hero?slug=${encodeURIComponent(tenant.slug)}`
      : `${import.meta.env.BASE_URL}images/${heroImage}`;
  const heroAlt = isAustinCares
    ? "High school student leaders taking charge"
    : tenant.slug === "austincares"
      ? "Austin Icons — Keep Austin Kind"
      : isPortland
        ? "Portland Oregon skyline"
        : isSacramento
          ? "Sacramento California skyline"
          : isBulverde
            ? "Bulverde Community Park, Texas Hill Country"
            : isStLouis
              ? "St. Louis skyline and Gateway Arch at night"
              : isToky
                ? "Tokyo skyline with Tokyo Skytree at dusk"
                : "Austin Texas stylized illustration";

  return (
    <Layout>
      {/* FEATURE INTEREST MODAL */}
      <Dialog open={featureModalOpen} onOpenChange={(open) => {
        setFeatureModalOpen(open);
        if (!open) { setFeatureStatus("idle"); setFeatureEmail(""); setFeatureError(""); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Bell className="w-5 h-5 text-primary" />
              Stay in the loop
            </DialogTitle>
            <DialogDescription>
              Get notified when new features launch on EventCarpooling.com — carpooling tools, new city editions, and more.
            </DialogDescription>
          </DialogHeader>

          {featureStatus === "done" ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
              <p className="font-semibold text-lg">You're on the list!</p>
              <p className="text-muted-foreground text-sm">We've sent a confirmation to <strong>{featureEmail}</strong>. We'll be in touch as features roll out.</p>
              <Button variant="outline" className="mt-2" onClick={() => setFeatureModalOpen(false)}>Close</Button>
            </div>
          ) : (
            <form onSubmit={handleFeatureInterestSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label htmlFor="feature-email" className="text-sm font-medium">Your email address</label>
                <Input
                  id="feature-email"
                  type="email"
                  placeholder="you@example.com"
                  value={featureEmail}
                  onChange={(e) => setFeatureEmail(e.target.value)}
                  required
                  disabled={featureStatus === "submitting"}
                  autoComplete="email"
                />
                {featureError && <p className="text-xs text-destructive">{featureError}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={featureStatus === "submitting" || !featureEmail.trim()}>
                {featureStatus === "submitting" ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                ) : (
                  "Notify me about feature updates"
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">No spam, ever. Unsubscribe anytime.</p>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ANNOUNCEMENT BANNER */}
      <div className="bg-primary/10 border-b border-primary/20 py-2.5 px-4 text-center text-sm flex items-center justify-center gap-3 flex-wrap">
        <span>
          <span className="font-semibold text-primary">Coming Soon:</span>{" "}
          <span className="text-foreground/80">Become the events and carpooling person for your city or neighborhood:</span>{" "}
          <a href="https://eventcarpooling.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2 hover:opacity-80">
            eventcarpooling.com
          </a>
        </span>
        <button
          onClick={() => setFeatureModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
        >
          <Bell className="w-3 h-3" />
          Want to be notified about feature updates?
        </button>
      </div>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-background py-6 sm:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--color-primary)_0%,transparent_40%)] opacity-5" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 text-secondary font-medium text-sm mb-4 border border-secondary/20">
                <Sparkles className="w-4 h-4" />
                <span>{jt(`The best of ${cityShortName}, hand-picked for you`, JA.bestOf(cityShortName))}</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl font-bold font-serif text-balance text-foreground mb-4 leading-[1.1]">
                {jt("Stop scrolling.", JA.stopScrolling)} <br/>
                {isAustinCares ? (
                  <>Start <span className="text-primary italic">helping</span>.</>
                ) : isToky && lang === "ja" ? (
                  <span className="text-primary italic">{JA.startExperiencing(cityShortName)}</span>
                ) : (
                  <>Start <span className="text-primary italic">experiencing</span> {cityShortName}.</>
                )}
              </h1>
              
              <p className="text-base text-muted-foreground mb-5 leading-relaxed max-w-xl">
                {isAustinCares
                  ? "Every Sunday, a curated list of volunteering opportunities, school events, networking activities, and high school club stuff will be published for the week ahead."
                  : tenant.slug === "austincares"
                  ? `Check out a curated list of volunteer activities, school contests, movie nights, and fun activities for the week ahead (Sunday–Saturday). Carpooling functionality will be enabled with your trusted network!`
                  : isToky && lang === "ja"
                  ? JA.heroSubtext
                  : `Every Sunday, a curated list of the best live music, food pop-ups, tech meetups, and hidden gems happening in ${cityShortName} for the week ahead (Sunday–Saturday). Carpooling functionality will be enabled with your trusted network!`}
              </p>

              <div className="mb-8 bg-secondary/5 border border-secondary/20 rounded-2xl px-6 py-5 max-w-xl">
                <p className="text-foreground/90 leading-relaxed text-base italic">
                  {isAustinCares
                    ? `"Hey crew! I scour inboxes and comb through Brushy Creek so you don't have to — volunteer gigs, school events, networking mixers, and club happenings, all lined up for the week ahead. Here's your fresh BCRR Crew Events digest — let's make some noise, Brushy Creek 😎"`
                    : isStLouis
                    ? `"Hey St. Louis! Every week I comb through event newsletters and hand-pick the best things happening around the city — from Forest Park to Soulard to the Arch. Here's your curated digest. Let's Go Redbirds! ⚾"`
                    : isToky && lang === "ja"
                    ? JA.curatorQuote
                    : tenant.slug === "austincares"
                    ? `"Hey Austin! I combed through various event newsletters in my inbox and hand-picked some cool events happening around the city including upcoming special events. Here's your curated digest — get out there and enjoy Austin 🤠"`
                    : `"Hey ${cityShortName}! I combed through various event newsletters in my inbox and hand-picked some cool events happening around the city including upcoming special events. Here's your curated digest — get out there and enjoy ${cityShortName} 🤠"`
                  }
                </p>
                {(isAustinCares || isSacramento || isStLouis || tenant.slug === "austin") && (
                  <p className="mt-3 text-sm font-semibold text-primary not-italic">
                    —{" "}
                    {isAustinCares ? (
                      <span className="inline-flex items-center gap-1.5">
                        Rohan
                        <img
                          src="https://flagcdn.com/20x15/fr.png"
                          srcSet="https://flagcdn.com/40x30/fr.png 2x"
                          width={20}
                          height={15}
                          alt="France flag"
                          className="inline-block rounded-[2px] align-middle"
                        />
                        <img
                          src="https://flagcdn.com/20x15/us.png"
                          srcSet="https://flagcdn.com/40x30/us.png 2x"
                          width={20}
                          height={15}
                          alt="United States flag"
                          className="inline-block rounded-[2px] align-middle"
                        />
                      </span>
                    ) : isPortland ? (
                      "Meg"
                    ) : isSacramento ? (
                      "Bob"
                    ) : isStLouis ? (
                      "Phil"
                    ) : (
                      <a href="https://customersuccessforgood.com/" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">Raj</a>
                    )}
                  </p>
                )}
              </div>

              <div id="subscribe" className="bg-card p-6 rounded-2xl shadow-xl shadow-black/5 border border-border/60 scroll-mt-24">
                <SubscribeForm />
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className={`relative ${(isAustinCares || isBulverde) ? "order-first lg:order-none" : ""} block`}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-secondary/20 to-accent/20 rounded-3xl transform rotate-3 scale-105" />
              <img 
                src={heroSrc}
                alt={heroAlt}
                className={`relative rounded-3xl shadow-2xl border border-border w-full ${tenant.slug === "austincares" ? "object-contain aspect-[3/4]" : isAustinCares ? "object-contain aspect-[16/9] bg-stone-900" : "object-cover aspect-[4/3]"}`}
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
                      <span>{catLabel(cat)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Event Map — Austin & Brushy Creek only */}
          {showMap && latestDigest?.events && (
            <div className="mb-10">
              <h3 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
                🗺️ Where this week's events are happening
              </h3>
              <EventMap
                events={latestDigest.events as any[]}
                center={mapCenter}
                radiusMiles={30}
                height={340}
              />
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
              const businessSpotlights = latestDigest.events.filter((e: any) => e.isBusinessSpotlight === true);
              const communityPosts = latestDigest.events.filter((e: any) => e.isPost === true);
              const upcomingEvents = latestDigest.events.filter((e: any) =>
                !e.isPost &&
                !e.isBusinessSpotlight &&
                (e.featured || isEventTodayOrLater(e.date))
              );
              const visibleEvents = categoryFilter === "All"
                ? upcomingEvents
                : upcomingEvents.filter((e: any) => getDisplayCategory(e) === categoryFilter);
              const allEventsSorted = [...visibleEvents]
                .sort((a: any, b: any) => parseEventDateForSort(a.date) - parseEventDateForSort(b.date));
              return (
                <div className="space-y-8">
                  {categoryFilter === "All" && businessSpotlights.length > 0 && (
                    <div className="flex flex-col gap-6">
                      <h3 className="font-serif text-2xl font-bold flex items-center gap-3">
                        <span className="w-8 h-1 bg-sky-500 rounded-full"></span>
                        <Trophy className="w-6 h-6 text-sky-500" />
                        Business Spotlight
                      </h3>
                      {businessSpotlights.map((biz: any, bi: number) => (
                        <motion.div
                          key={bi}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: bi * 0.1 }}
                        >
                          <div className="relative rounded-3xl border-2 border-sky-400/60 bg-gradient-to-br from-sky-50/80 via-card to-card dark:from-sky-950/30 shadow-lg shadow-sky-100/40 dark:shadow-sky-900/20 overflow-hidden">
                            {biz.imageUrl ? (
                              <a href={biz.link || "#"} target="_blank" rel="noopener noreferrer" className="block">
                                <img
                                  src={biz.imageUrl}
                                  alt={biz.title}
                                  className="w-full object-contain bg-gray-50"
                                  style={{ maxHeight: "260px" }}
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                />
                              </a>
                            ) : null}
                            <div className="px-4 py-2 bg-sky-500 flex items-center gap-2">
                              <Trophy className="w-3 h-3 text-white" />
                              <span className="text-xs font-bold text-white tracking-widest uppercase">Business Spotlight</span>
                            </div>
                            <div className="p-6 sm:p-8">
                              <div className="flex items-center gap-3 mb-3">
                                {!biz.imageUrl && biz.link && (
                                  <img
                                    src={`https://www.google.com/s2/favicons?domain=${(() => { try { return new URL(biz.link).hostname; } catch { return ""; } })()}&sz=64`}
                                    alt=""
                                    className="w-10 h-10 rounded-xl object-contain bg-white border border-border p-1.5 shrink-0 shadow-sm"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                  />
                                )}
                                <h4 className="font-serif text-xl font-bold text-foreground">{biz.title}</h4>
                              </div>
                              {biz.description && (
                                <p className="text-muted-foreground leading-relaxed mb-4 whitespace-pre-wrap">{biz.description}</p>
                              )}
                              {biz.link && (
                                <a
                                  href={biz.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
                                  style={{ background: "linear-gradient(135deg, #0284c7, #38bdf8)", boxShadow: "0 4px 14px rgba(2,132,199,0.35)" }}
                                >
                                  Visit Website <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  {categoryFilter === "All" && communityPosts.length > 0 && (
                    <div className="flex flex-col gap-6">
                      <h3 className="font-serif text-2xl font-bold flex items-center gap-3">
                        <span className="w-8 h-1 bg-green-500 rounded-full"></span>
                        <Leaf className="w-6 h-6 text-green-500" />
                        Community Spotlight
                      </h3>
                      {communityPosts.map((post: any, pi: number) => (
                        <motion.div
                          key={pi}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: pi * 0.1 }}
                        >
                          <div className={`relative rounded-3xl border-2 overflow-hidden shadow-lg ${isStLouis ? "border-red-400/60 bg-gradient-to-br from-red-50/80 via-card to-card dark:from-red-950/30 shadow-red-100/40 dark:shadow-red-900/20" : "border-green-400/60 bg-gradient-to-br from-green-50/80 via-card to-card dark:from-green-950/30 shadow-green-100/40 dark:shadow-green-900/20"}`}>
                            {post.imageUrl ? (
                              <a href={post.link || "#"} target="_blank" rel="noopener noreferrer" className="block">
                                <img
                                  src={post.imageUrl}
                                  alt={post.title}
                                  className="w-full object-contain bg-gray-50"
                                  style={{ maxHeight: "260px" }}
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                />
                              </a>
                            ) : null}
                            <div className={`px-4 py-2 flex items-center gap-2 ${isStLouis ? "bg-red-700" : "bg-green-600"}`}>
                              <Leaf className="w-3 h-3 text-white" />
                              <span className="text-xs font-bold text-white tracking-widest uppercase">Community Spotlight</span>
                            </div>
                            <div className="p-6 sm:p-8">
                              <div className="flex items-center gap-3 mb-3">
                                {!post.imageUrl && post.link && (
                                  <img
                                    src={`https://www.google.com/s2/favicons?domain=${(() => { try { return new URL(post.link).hostname; } catch { return ""; } })()}&sz=64`}
                                    alt=""
                                    className="w-10 h-10 rounded-xl object-contain bg-white border border-border p-1.5 shrink-0 shadow-sm"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                  />
                                )}
                                <h4 className="font-serif text-xl font-bold text-foreground">{post.title}</h4>
                              </div>
                              {post.description && (
                                <p className="text-muted-foreground leading-relaxed mb-4">{post.description}</p>
                              )}
                              {post.deadline && (
                                <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold mb-4 ${isStLouis ? "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200" : "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200"}`}>
                                  <Calendar className="w-3.5 h-3.5" />
                                  Apply by {post.deadline}
                                </div>
                              )}
                              {post.link && (
                                <a
                                  href={post.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
                                  style={{ background: "linear-gradient(135deg, #16a34a, #22c55e)", boxShadow: "0 4px 14px rgba(22,163,74,0.35)" }}
                                >
                                  Apply Now <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  {allEventsSorted.length > 0 ? (
                    <div className="flex flex-col gap-6">
                      {allEventsSorted.map((event: any, i: number) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.05 }}
                        >
                          {event.featured ? (
                            <div className="relative rounded-3xl border-2 border-amber-400/60 bg-gradient-to-br from-amber-50/80 via-card to-card dark:from-amber-950/30 shadow-lg shadow-amber-100/40 dark:shadow-amber-900/20 overflow-hidden">
                              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />
                              <div className="absolute top-4 right-4 z-10">
                                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-amber-400 text-amber-950 shadow-sm">
                                  <Star className="w-3 h-3 fill-amber-950" />
                                  {jt("Special Event", JA.specialEvent)}
                                </span>
                              </div>
                              <div className="p-6 sm:p-8">
                                <div className="max-w-xl">
                                  <EventCard event={translateEvent(event)} digestId={latestDigest.id} />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <EventCard event={translateEvent(event)} digestId={latestDigest.id} />
                          )}
                        </motion.div>
                      ))}
                    </div>
                  ) : businessSpotlights.length === 0 && communityPosts.length === 0 ? (
                    <div className="text-center py-16 bg-muted/30 rounded-3xl border border-dashed border-border">
                      <p className="text-4xl mb-3">{CAT_CONFIG[categoryFilter].emoji}</p>
                      <p className="text-lg font-serif font-bold text-foreground mb-2">{jt(`No ${CAT_CONFIG[categoryFilter].label} events this week`, JA.noEvents(JA_CAT[categoryFilter] ?? categoryFilter))}</p>
                      <p className="text-muted-foreground text-sm">{jt(`Check back next issue for ${categoryFilter.toLowerCase()} events.`, JA.checkBack(JA_CAT[categoryFilter]?.toLowerCase() ?? categoryFilter))}</p>
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

      {SHOW_AUSTIN_CARES && (
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div style={{ background: "linear-gradient(135deg,#064e3b 0%,#065f46 55%,#047857 100%)" }} className="rounded-3xl p-8 sm:p-10">
              {/* Header row */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden">
                  <img src="/austin-cares-logo.png" alt="Austin Cares" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "#a7f3d0" }}>Coming Soon</p>
                  <p className="text-xl font-extrabold tracking-tight" style={{ color: "#ecfdf5" }}>Austin Cares Newsletter</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm leading-relaxed mb-6" style={{ color: "#d1fae5" }}>
                A dedicated newsletter for the heart of Austin —{" "}
                <strong style={{ color: "#ecfdf5" }}>Austin Cares</strong> will cover the issues and opportunities that make this city more than just a place to live:
              </p>

              {/* Feature grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-7">
                {[
                  { emoji: "🏛️", label: "Civics & community" },
                  { emoji: "🙌", label: "Volunteering opportunities" },
                  { emoji: "💡", label: "Tech-for-good networking" },
                  { emoji: "💰", label: "Fundraising campaigns" },
                  { emoji: "💼", label: "Nonprofit job listings" },
                  { emoji: "🏆", label: "Board-level recruiting" },
                ].map(({ emoji, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-lg">{emoji}</span>
                    <span className="text-sm font-medium" style={{ color: "#d1fae5" }}>{label}</span>
                  </div>
                ))}
              </div>

              <p className="text-sm leading-relaxed mb-7" style={{ color: "#d1fae5" }}>
                If you care about making Austin a better city,{" "}
                <strong style={{ color: "#ecfdf5" }}>this one's for you. Watch this space.</strong>
              </p>

              <div className="text-center">
                <a
                  href="https://eventcarpooling.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-sm font-bold no-underline px-7 py-3 rounded-full transition-opacity hover:opacity-90"
                  style={{ background: "#fbbf24", color: "#1c1917" }}
                >
                  Learn more at EventCarpooling.com →
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

    </Layout>
  );
}
