import { useRoute } from "wouter";
import { Layout } from "@/components/layout";
import { EventCard } from "@/components/event-card";
import { useAllDigests, useLatestDigest } from "@/hooks/use-events";
import { format, parseISO } from "date-fns";
import { Calendar, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

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
            <span>Week of {format(parseISO(digest.weekOf.substring(0, 10)), "MMMM d, yyyy")}</span>
          </div>
          
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] mb-8">
            {digest.subject}
          </h1>
          
          <div className="prose prose-lg prose-p:text-muted-foreground prose-p:leading-relaxed max-w-none bg-card p-8 rounded-3xl border border-border shadow-sm">
            <p className="whitespace-pre-wrap">{digest.intro}</p>
          </div>
        </header>

        <section>
          <h2 className="font-serif text-3xl font-bold mb-8 flex items-center gap-3">
            <span className="w-8 h-1 bg-primary rounded-full"></span>
            This Week's Curated Events
          </h2>
          
          <div className="grid sm:grid-cols-2 gap-8">
            {digest.events.map((event, i) => (
              <EventCard key={i} event={event} digestId={digest.id} />
            ))}
          </div>
        </section>

        <section className="mt-24 p-10 bg-secondary rounded-3xl text-secondary-foreground text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--color-primary)_0%,transparent_70%)] opacity-20" />
          <div className="relative z-10">
            <h3 className="font-serif text-3xl font-bold mb-4">Don't miss the next one</h3>
            <p className="text-secondary-foreground/80 mb-8 max-w-lg mx-auto text-lg">
              Get next week's best Austin events delivered straight to your inbox. No spam, just the good stuff.
            </p>
            <Link href="/#subscribe" className="inline-flex items-center justify-center rounded-xl bg-background px-8 py-4 text-base font-bold text-foreground shadow-lg transition-all hover:bg-background/90 hover:-translate-y-1">
              Subscribe for Free
            </Link>
          </div>
        </section>
      </article>
    </Layout>
  );
}
