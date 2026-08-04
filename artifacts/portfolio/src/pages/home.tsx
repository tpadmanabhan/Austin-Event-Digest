import { motion, useScroll, useTransform } from "framer-motion";
import { 
  Terminal, Server, Globe2, ShieldCheck, Mail, Database, 
  Map as MapIcon, Calendar, Zap, LayoutDashboard, Languages, Lock, Award, Heart
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } 
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const TerminalHeader = () => {
  const [time, setTime] = useState(new Date().toISOString());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toISOString()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border/50 bg-background/80 backdrop-blur-md font-mono text-xs text-muted-foreground uppercase">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-none bg-primary animate-pulse shadow-[0_0_8px_rgba(255,100,0,0.8)]" />
          SYS.ONLINE
        </span>
        <span className="hidden sm:inline-block border-l border-border/50 pl-4">
          EVENTCARPOOLING.COM
        </span>
      </div>
      <div>{time}</div>
    </div>
  );
};

export default function Home() {
  const containerRef = useRef(null);
  
  return (
    <div ref={containerRef} className="min-h-[100dvh] w-full bg-background text-foreground selection:bg-primary selection:text-primary-foreground relative overflow-hidden">
      
      <div className="fixed inset-0 pointer-events-none z-0 bg-grid-pattern opacity-30" />
      
      {/* Noise overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.015] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />

      <TerminalHeader />

      <main className="relative z-10 max-w-6xl mx-auto px-6 sm:px-12 pt-32 pb-24 flex flex-col gap-32">
        
        {/* HERO SECTION */}
        <section className="flex flex-col gap-6 pt-12 lg:pt-24 min-h-[60vh] justify-center">
          <motion.div initial="hidden" animate="visible" variants={fadeIn}>
            <p className="font-mono text-primary text-sm uppercase tracking-widest mb-4">
              [ ACCESS GRANTED ]
            </p>
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-tight text-foreground mb-6 max-w-4xl">
              I build production-scale infrastructure for local communities.
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl font-light leading-relaxed">
              Quietly running the engine behind eventcarpooling.com — a live multi-city discovery and newsletter platform powering thousands of weekly digests across the globe.
            </p>
          </motion.div>
          
          <motion.div 
            initial="hidden" animate="visible" variants={staggerContainer}
            className="flex flex-wrap gap-4 mt-8 font-mono text-sm"
          >
            <motion.div variants={fadeIn} className="px-4 py-2 border border-border bg-card text-foreground flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-primary" />
              7+ Active Cities
            </motion.div>
            <motion.div variants={fadeIn} className="px-4 py-2 border border-border bg-card text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              Weekly Global Digests
            </motion.div>
            <motion.div variants={fadeIn} className="px-4 py-2 border border-border bg-card text-foreground flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary" />
              Full-Stack TypeScript
            </motion.div>
          </motion.div>
        </section>

        {/* THE PLATFORM */}
        <section>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeIn} className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-2">The Platform</h2>
            <p className="text-muted-foreground font-mono text-sm uppercase tracking-wider">eventcarpooling.com</p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="p-8 border border-border/50 bg-card/40 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700" />
              <Server className="w-8 h-8 text-primary mb-6" />
              <h3 className="text-xl font-semibold text-foreground mb-3">Multi-Tenant Architecture</h3>
              <p className="text-muted-foreground leading-relaxed">
                A single unified pnpm monorepo (React + Vite frontend, Express REST API) serving per-city subdomain routing. Each tenant (Austin, St. Louis, Tokyo, Sacramento, Portland, Bulverde, AustinCares) has isolated data, branding, and auth boundaries.
              </p>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="p-8 border border-border/50 bg-card/40 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700" />
              <Database className="w-8 h-8 text-primary mb-6" />
              <h3 className="text-xl font-semibold text-foreground mb-3">PostgreSQL + Drizzle ORM</h3>
              <p className="text-muted-foreground leading-relaxed">
                Robust schema migrations and multi-tenant data isolation. Ensures zero cross-contamination between city event hubs while sharing the core processing logic and automated startup migrations.
              </p>
            </motion.div>
          </div>
        </section>

        {/* DATA INGESTION */}
        <section>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeIn} className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-2">Event Aggregation Pipeline</h2>
            <p className="text-muted-foreground font-mono text-sm uppercase tracking-wider">Ingest • Parse • Normalize</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Zap className="w-6 h-6 text-primary" />,
                title: "API Integrations",
                desc: "Real-time sync with Ticketmaster, Eventbrite, Luma, Meetup, Songkick, and Bandsintown to aggregate local scenes."
              },
              {
                icon: <Terminal className="w-6 h-6 text-primary" />,
                title: "AI Extraction",
                desc: "OpenAI-powered parsing extracts structured event details from arbitrary URLs and unstructured newsletter emails."
              },
              {
                icon: <MapIcon className="w-6 h-6 text-primary" />,
                title: "Geocoding",
                desc: "Automated venue mapping via Leaflet.js with a custom geocoding pipeline for radius-based filtering and custom markers."
              }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}
                className="p-6 border-l border-t border-border/30 bg-card/20 hover:bg-card/40 transition-colors"
              >
                <div className="mb-4">{item.icon}</div>
                <h4 className="text-lg font-medium text-foreground mb-2">{item.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* AUTOMATION & INFRA */}
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeIn}>
              <h2 className="text-3xl font-bold text-foreground mb-4">Infrastructure & Delivery</h2>
              <div className="h-1 w-12 bg-primary mb-8" />
              <div className="space-y-8">
                <div>
                  <h4 className="text-xl font-medium text-foreground flex items-center gap-3 mb-2">
                    <Mail className="w-5 h-5 text-primary" />
                    Automated Digest Engine
                  </h4>
                  <p className="text-muted-foreground">
                    Scheduled tasks run overnight to auto-remove past events and compile customized weekly HTML digests. Delivered directly to real subscribers across multiple timezones on Sunday mornings.
                  </p>
                </div>
                <div>
                  <h4 className="text-xl font-medium text-foreground flex items-center gap-3 mb-2">
                    <Languages className="w-5 h-5 text-primary" />
                    Internationalization Pipeline
                  </h4>
                  <p className="text-muted-foreground">
                    Built a localized experience for tokyo.eventcarpooling.com featuring a Japanese translation pipeline with PostgreSQL caching for rapid, cost-effective rendering.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}
              className="relative p-1 bg-border/30"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-20 blur-xl" />
              <div className="bg-card p-6 border border-border/50 relative z-10 h-full font-mono text-sm">
                <div className="flex gap-2 mb-4 border-b border-border/50 pb-4">
                  <div className="w-3 h-3 rounded-full bg-border" />
                  <div className="w-3 h-3 rounded-full bg-border" />
                  <div className="w-3 h-3 rounded-full bg-border" />
                </div>
                <div className="text-muted-foreground space-y-2">
                  <p><span className="text-primary">{`>`}</span> cron: [0 4 * * 0] generate-digests</p>
                  <p className="pl-4 text-[13px] opacity-70">Starting run for 7 tenants...</p>
                  <p className="pl-4 text-[13px] opacity-70">Compiled Austin (1,432 subs) - OK</p>
                  <p className="pl-4 text-[13px] opacity-70">Compiled Tokyo (JP cache hit) - OK</p>
                  <p><span className="text-primary">{`>`}</span> cron: [0 0 * * *] data-cleanup</p>
                  <p className="pl-4 text-[13px] opacity-70">Pruning events &lt; NOW() - OK</p>
                  <p className="mt-4 animate-pulse text-primary">_</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* SECURITY & ADMIN */}
        <section>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeIn} className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-2">Control & Security</h2>
            <p className="text-muted-foreground font-mono text-sm uppercase tracking-wider">Mission Control</p>
          </motion.div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="p-6 border border-border bg-card/20 hover:bg-card transition-colors">
              <ShieldCheck className="w-7 h-7 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">HMAC Auth</h3>
              <p className="text-sm text-muted-foreground">Secure per-tenant authentication and RSVP token signing ensuring data boundaries hold at scale.</p>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="p-6 border border-border bg-card/20 hover:bg-card transition-colors">
              <LayoutDashboard className="w-7 h-7 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Live-Editing</h3>
              <p className="text-sm text-muted-foreground">Production admin dashboards to patch live digests, re-geocode venues, and manage content in real-time.</p>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="p-6 border border-border bg-card/20 hover:bg-card transition-colors">
              <Lock className="w-7 h-7 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Bot Protection</h3>
              <p className="text-sm text-muted-foreground">Integrated Cloudflare Turnstile workflows protecting community endpoints and form submissions from abuse.</p>
            </motion.div>
          </div>
        </section>

        {/* FEATURES & EXTRAS */}
        <section className="mb-24">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeIn} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="group border border-border bg-card overflow-hidden">
              <div className="h-48 bg-muted flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMWEyMDI2Ii8+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMzMzM5NDUiLz4KPC9zdmc+')] opacity-50 mix-blend-screen" />
                <Award className="w-16 h-16 text-primary opacity-80 transform group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-2">Gamification Engine</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Engineered an XP system, badges, city leaderboards, weekly challenges, and streak tracking to incentivize community engagement and event discovery.
                </p>
              </div>
            </div>

            <div className="group border border-border bg-card overflow-hidden">
              <div className="h-48 bg-muted flex items-center justify-center relative overflow-hidden">
                 <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMWEyMDI2Ii8+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMzMzM5NDUiLz4KPC9zdmc+')] opacity-50 mix-blend-screen" />
                <Heart className="w-16 h-16 text-primary opacity-80 transform group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-2">AustinCares</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  A parallel platform for community deals and local business integration built on the same core infrastructure, utilizing custom Leaflet maps and data isolation.
                </p>
              </div>
            </div>

          </motion.div>
        </section>

      </main>

      <footer className="border-t border-border bg-card py-12 relative z-10">
        <div className="max-w-6xl mx-auto px-6 sm:px-12 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="font-mono text-sm text-muted-foreground">
            <span className="text-primary mb-1 block">SYSTEM STATUS: NOMINAL</span>
            © {new Date().getFullYear()} / Infrastructure Engineer
          </div>
          <div className="flex gap-6 font-mono text-sm uppercase tracking-wider">
            <a href="https://eventcarpooling.com" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">Platform</a>
            <a href="mailto:hello@example.com" className="text-muted-foreground hover:text-primary transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
