import { ArrowLeft, ExternalLink, Gift } from "lucide-react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { LEADERSHIP_TOYS_FOR_TOTS_URL } from "@/lib/leadership-toys-for-tots";

export default function LeadershipToysForTotsPage() {
  return (
    <Layout>
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#314363] underline underline-offset-4 hover:text-[#253550]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Leadership Austin home
        </Link>

        <section className="overflow-hidden rounded-3xl border border-[#314363]/15 bg-card shadow-sm">
          <div className="bg-[#314363] px-6 py-8 text-white sm:px-10 sm:py-10">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-[#8bd8f0]">
              <Gift className="h-4 w-4" aria-hidden="true" />
              Community giving · Austin, TX
            </p>
            <h1 className="mt-3 font-serif text-4xl font-bold sm:text-5xl">
              Toys for Tots
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/85">
              Visit the official Austin, TX campaign page for donation information.
            </p>
          </div>

          <div className="space-y-5 p-6 sm:p-10">
            <a
              href={LEADERSHIP_TOYS_FOR_TOTS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#314363] px-6 py-4 text-center font-bold text-white transition-colors hover:bg-[#253550] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4EBEE7] focus-visible:ring-offset-2 sm:w-auto"
            >
              Open the official Austin campaign
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              This page shares the official campaign link only. It does not announce a
              Leadership Austin collection or drop-off location.
            </p>
          </div>
        </section>
      </main>
    </Layout>
  );
}
