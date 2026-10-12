const SF_READINGS = [
  {
    href: "https://hai.stanford.edu/ai-index/2026-ai-index-report",
    title: "AI Index Report 2026",
    source: "Stanford HAI",
    note: "Annual data on AI research, investment, policy and public opinion.",
  },
  {
    href: "https://datasociety.net/library/",
    title: "Research Library",
    source: "Data & Society",
    note: "Reports and essays on the social effects of data-centric technology.",
  },
  {
    href: "https://www.harpercollins.com/products/the-ai-con-emily-m-benderalex-hanna",
    title: "The AI Con",
    source: "Book by Emily M. Bender and Alex Hanna",
    note: "A critical look at AI hype and who it serves.",
  },
  {
    href: "https://us.macmillan.com/books/9781250897930/theworldsisee",
    title: "The Worlds I See",
    source: "Book by Fei-Fei Li",
    note: "A memoir from one of the researchers behind modern computer vision.",
  },
];

export function SfAiEthicsSection({ className = "" }: { className?: string }) {
  return (
    <section
      aria-labelledby="sf-ai-ethics-title"
      data-testid="section-sf-ai-ethics"
      className={`sf-ethics rounded-2xl border border-border bg-card p-5 sm:p-6 ${className}`}
    >
      <p className="mb-1 text-[11px] font-bold uppercase tracking-[.2em] text-primary">Reading list / Bay Area</p>
      <h2 id="sf-ai-ethics-title" className="mb-3 text-xl font-bold">AI Ethics</h2>
      <p className="text-sm leading-7 text-muted-foreground">
        San Francisco builds a lot of the technology the rest of the world uses. These reads help keep
        the conversation grounded: use AI to find your way to the room, then put the phone down and talk to people.
      </p>
      <ol className="mt-4 divide-y divide-border">
        {SF_READINGS.map((r, i) => (
          <li key={r.href} className="flex gap-4 py-3">
            <span className="w-6 shrink-0 pt-0.5 text-xs font-bold tabular-nums text-primary">0{i + 1}</span>
            <div className="text-sm leading-6">
              <a
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`link-sf-reading-${i}`}
                className="font-semibold text-foreground underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
              >
                {r.title}
              </a>
              <span className="text-muted-foreground"> / {r.source}</span>
              <p className="text-muted-foreground">{r.note}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
