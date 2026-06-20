import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Zap, Check, ExternalLink } from "lucide-react";
import { PlatformLayout } from "@/components/platform-layout";

interface TenantSummary {
  slug: string;
  name: string;
  city: string;
  accentColor: string;
  categories: string[];
}

function useTenantList() {
  return useQuery<TenantSummary[]>({
    queryKey: ["tenants-list"],
    queryFn: async () => {
      const res = await fetch("/api/tenants/list");
      if (!res.ok) throw new Error("Failed to fetch tenants");
      const data = await res.json();
      return data.tenants as TenantSummary[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

const CATEGORIES = [
  {
    name: "Tech",
    emoji: "💻",
    description: "Startup meetups, AI demos, developer nights, and founder events.",
    sources: ["Luma", "Meetup", "Eventbrite"],
    color: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  },
  {
    name: "Music",
    emoji: "🎵",
    description: "Live concerts, open mics, album releases, and music festivals.",
    sources: ["Bandsintown", "Songkick", "Eventbrite"],
    color: "bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-950/30 dark:border-purple-800 dark:text-purple-300",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  },
  {
    name: "Food & Drink",
    emoji: "🍔",
    description: "Food pop-ups, restaurant openings, farmers markets, and tastings.",
    sources: ["Luma", "Eventbrite"],
    color: "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-300",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  },
  {
    name: "Wellness",
    emoji: "🧘",
    description: "Yoga classes, meditation circles, hiking groups, and outdoor fitness.",
    sources: ["Luma", "Meetup", "Eventbrite"],
    color: "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300",
    badge: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  },
  {
    name: "Civics",
    emoji: "🏛️",
    description: "City council meetings, neighborhood events, volunteer drives, and community org.",
    sources: ["Meetup", "Eventbrite"],
    color: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  },
];

const STEPS = [
  {
    number: "01",
    icon: "📍",
    title: "Pick your city",
    description: "Choose any city and we set up a dedicated subdomain at yourCity.eventcarpooling.com.",
  },
  {
    number: "02",
    icon: "📋",
    title: "Choose your categories",
    description: "Select which event types matter most — Tech, Music, Food, Wellness, or Civics.",
  },
  {
    number: "03",
    icon: "🚀",
    title: "Go live",
    description: "We automatically discover events from top sources and send a polished weekly digest.",
  },
];

export default function PlatformHome() {
  const { data: tenants, isLoading: loadingTenants } = useTenantList();

  return (
    <PlatformLayout>
      {/* HERO */}
      <section className="relative overflow-hidden bg-background py-20 sm:py-28 lg:py-36">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--color-primary)_0%,transparent_45%)] opacity-[0.06]" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-8 border border-primary/20">
              <Zap className="w-4 h-4" />
              <span>Automated city newsletters, powered by real data</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold font-serif text-balance text-foreground mb-6 leading-[1.1]">
              Your city deserves its{" "}
              <span className="text-primary italic">own newsletter.</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
              Launch a weekly events digest for any city in minutes. We automatically discover events
              from Luma, Meetup, Eventbrite, Bandsintown, and more — then send a beautifully curated
              email to your subscribers.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="#launch"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:-translate-y-0.5"
              >
                Launch your city
                <span className="text-primary-foreground/70">→</span>
              </a>
              <a
                href="https://austin.eventcarpooling.com"
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                See Austin's newsletter
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20 bg-card border-y border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-serif text-4xl font-bold mb-4 text-foreground">How it works</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              From zero to weekly newsletter in three steps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative flex flex-col items-start p-8 rounded-3xl bg-background border border-border hover:border-primary/30 transition-colors"
              >
                <div className="text-xs font-bold text-primary/50 tracking-widest uppercase mb-4">
                  {step.number}
                </div>
                <div className="text-4xl mb-4">{step.icon}</div>
                <h3 className="font-serif text-xl font-bold text-foreground mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORY SHOWCASE */}
      <section className="py-20 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-serif text-4xl font-bold mb-4 text-foreground">
              Five categories, dozens of sources
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Pick the categories that define your city. We pull from the top platforms automatically.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`p-6 rounded-2xl border ${cat.color} flex flex-col gap-4`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{cat.emoji}</span>
                  <h3 className="font-serif text-lg font-bold">{cat.name}</h3>
                </div>
                <p className="text-sm leading-relaxed opacity-80">{cat.description}</p>
                <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t border-current/10">
                  {cat.sources.map(source => (
                    <span key={source} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cat.badge}`}>
                      {source}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}

            {/* Features card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="p-6 rounded-2xl border border-dashed border-border bg-muted/30 flex flex-col gap-3 justify-center"
            >
              <h3 className="font-serif text-lg font-bold text-foreground">And it all just works</h3>
              <ul className="space-y-2">
                {[
                  "Weekly digest auto-generated",
                  "Subscribers managed for you",
                  "One-click newsletter send",
                  "RSVP & carpool coordination",
                ].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* LIVE CITIES */}
      <section className="py-20 bg-card border-t border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-serif text-4xl font-bold mb-4 text-foreground">Live cities</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              These cities are already sending weekly newsletters. Yours could be next.
            </p>
          </div>

          {loadingTenants ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-36 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : tenants && tenants.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {tenants.map((tenant, i) => (
                <motion.a
                  key={tenant.slug}
                  href={`https://${tenant.slug}.eventcarpooling.com`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group flex flex-col gap-3 p-6 rounded-2xl bg-background border border-border hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-lg"
                         style={{ backgroundColor: tenant.accentColor }}>
                      <MapPin className="h-5 w-5" />
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-foreground">{tenant.name}</h3>
                    <p className="text-sm text-muted-foreground">{tenant.city}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {tenant.categories.slice(0, 3).map(cat => (
                      <span key={cat} className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {cat}
                      </span>
                    ))}
                    {tenant.categories.length > 3 && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        +{tenant.categories.length - 3} more
                      </span>
                    )}
                  </div>
                </motion.a>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No cities live yet.</p>
          )}
        </div>
      </section>

      {/* LAUNCH CTA */}
      <section id="launch" className="py-24 bg-primary/5 border-t border-border">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-serif text-4xl sm:text-5xl font-bold text-foreground mb-6">
              Ready to launch your city?
            </h2>
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
              Join the platform and give your city the newsletter it deserves.
              Setup takes under five minutes.
            </p>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-10 py-4 text-base font-semibold text-primary-foreground shadow-xl shadow-primary/25 transition-all hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0"
              onClick={() => {
                const el = document.getElementById("launch-signup");
                if (el) el.scrollIntoView({ behavior: "smooth" });
                else alert("Signup form coming soon — check back shortly!");
              }}
            >
              Get started — it's free
            </button>
            <p className="text-xs text-muted-foreground mt-4">No credit card required.</p>
          </motion.div>
        </div>
      </section>
    </PlatformLayout>
  );
}
