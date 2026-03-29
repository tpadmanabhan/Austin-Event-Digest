import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowRight, Sparkles, Mail, CheckCircle2, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";

import { useSubscribe } from "@/hooks/use-newsletter";
import { useLatestDigest, useAllDigests } from "@/hooks/use-events";
import { Layout } from "@/components/layout";
import { EventCard } from "@/components/event-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const subscribeSchema = z.object({
  name: z.string().min(2, "Name is too short").optional().or(z.literal('')),
  email: z.string().email("Please enter a valid email address"),
});

export default function Home() {
  const { toast } = useToast();
  const { mutate: subscribe, isPending: isSubscribing } = useSubscribe();
  const { data: latestDigestRes, isLoading: isLoadingLatest } = useLatestDigest();
  const { data: allDigestsRes } = useAllDigests();

  const [subscribed, setSubscribed] = useState(false);

  const form = useForm<z.infer<typeof subscribeSchema>>({
    resolver: zodResolver(subscribeSchema),
    defaultValues: { name: "", email: "" },
  });

  const onSubmit = (values: z.infer<typeof subscribeSchema>) => {
    subscribe(
      { data: values },
      {
        onSuccess: () => {
          setSubscribed(true);
          form.reset();
          toast({
            title: "You're on the list! 🎉",
            description: "Keep an eye on your inbox this Sunday.",
          });
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "Uh oh!",
            description: err.message || "Failed to subscribe. Please try again.",
          });
        },
      }
    );
  };

  const latestDigest = latestDigestRes?.digest;
  const pastDigests = allDigestsRes?.digests?.filter(d => d.id !== latestDigest?.id).slice(0, 3) || [];

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
                {subscribed ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="font-serif text-2xl font-bold mb-2">You're on the list!</h3>
                    <p className="text-muted-foreground">Get ready for your first digest this Sunday.</p>
                  </div>
                ) : (
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Mail className="w-5 h-5 text-primary" />
                      Get the weekly newsletter
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Input 
                          placeholder="First Name (optional)" 
                          className="h-12 rounded-xl bg-background/50"
                          {...form.register("name")} 
                        />
                        {form.formState.errors.name && (
                          <p className="text-xs text-destructive px-1">{form.formState.errors.name.message}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Input 
                          placeholder="Email Address" 
                          type="email"
                          className="h-12 rounded-xl bg-background/50"
                          {...form.register("email")} 
                        />
                        {form.formState.errors.email && (
                          <p className="text-xs text-destructive px-1">{form.formState.errors.email.message}</p>
                        )}
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isSubscribing}
                      className="w-full h-12 text-base rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:-translate-y-0.5"
                    >
                      {isSubscribing ? "Subscribing..." : "Subscribe for Free"}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-3">
                      No spam. Unsubscribe anytime.
                    </p>
                  </form>
                )}
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
                  <EventCard event={event} />
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

      {/* PAST EDITIONS */}
      {pastDigests.length > 0 && (
        <section className="py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-serif text-3xl font-bold mb-10">Past Editions</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastDigests.map((digest) => (
                <Link 
                  key={digest.id} 
                  href={`/digest/${digest.id}`}
                  className="group block p-6 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all hover:-translate-y-1"
                >
                  <div className="flex items-center gap-3 text-muted-foreground mb-3 text-sm">
                    <Calendar className="w-4 h-4" />
                    {format(parseISO(digest.weekOf.substring(0, 10)), "MMMM d, yyyy")}
                  </div>
                  <h3 className="font-serif text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                    {digest.subject}
                  </h3>
                  <p className="text-muted-foreground text-sm line-clamp-2">
                    {digest.intro}
                  </p>
                  <div className="mt-6 flex items-center text-sm font-semibold text-primary">
                    Read Edition <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
}
