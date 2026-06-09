import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

import { useLatestDigest } from "@/hooks/use-events";
import { Layout } from "@/components/layout";
import { EventCard } from "@/components/event-card";
import { SubscribeForm } from "@/components/subscribe-form";

export default function Home() {
  const { data: latestDigestRes, isLoading: isLoadingLatest } = useLatestDigest();

  const latestDigest = latestDigestRes?.digest;

  return (
    <Layout>
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
                <span>The best of ATX, hand-picked for you</span>
              </div>
              
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold font-serif text-balance text-foreground mb-6 leading-[1.1]">
                Stop scrolling. <br/>
                Start <span className="text-primary italic">experiencing</span> Austin.
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground mb-10 leading-relaxed max-w-xl">
                Every Sunday, I cut through the noise and send you a curated list of the best live music, food pop-ups, tech meetups, and hidden gems happening in Austin this week.
              </p>

              <div id="subscribe" className="bg-card p-6 rounded-2xl shadow-xl shadow-black/5 border border-border/60">
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

          {isLoadingLatest ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-96 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : latestDigest?.events ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {latestDigest.events.slice(0, 3).map((event, i) => (
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
