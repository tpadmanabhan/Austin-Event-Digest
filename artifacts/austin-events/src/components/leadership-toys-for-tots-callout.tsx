import { Link } from "wouter";

export function LeadershipToysForTotsCallout() {
  return (
    <section
      aria-labelledby="leadership-toys-for-tots-callout-title"
      className="mx-auto max-w-5xl rounded-3xl border border-[#314363]/15 bg-[#f6f8fb] px-6 py-7 sm:px-8"
    >
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#314363]">
        Community giving · Austin, TX
      </p>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            id="leadership-toys-for-tots-callout-title"
            className="font-serif text-2xl font-bold text-[#314363]"
          >
            Support Toys for Tots
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Find the official Austin, TX campaign donation page and its current information.
          </p>
        </div>
        <Link
          href="/toys-for-tots"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#314363] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#253550] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4EBEE7] focus-visible:ring-offset-2"
        >
          View campaign information
        </Link>
      </div>
    </section>
  );
}
