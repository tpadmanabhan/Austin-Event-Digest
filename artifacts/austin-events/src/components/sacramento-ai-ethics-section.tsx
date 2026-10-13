const READINGS = [
  {
    href: "https://www.nist.gov/itl/ai-risk-management-framework",
    title: "AI Risk Management Framework",
    source: "NIST",
    note: "Practical ways to identify, measure and manage risks before deploying AI.",
  },
  {
    href: "https://oecd.ai/en/ai-principles",
    title: "Principles for Trustworthy AI",
    source: "OECD",
    note: "Human rights, transparency, accountability and democratic values in AI policy.",
  },
  {
    href: "https://yalebooks.yale.edu/book/9780300264630/atlas-of-ai/",
    title: "Atlas of AI",
    source: "Book by Kate Crawford",
    note: "The labor, resources and environmental costs behind artificial intelligence.",
  },
  {
    href: "https://virginia-eubanks.com/automating-inequality/",
    title: "Automating Inequality",
    source: "Book by Virginia Eubanks",
    note: "How automated public-service decisions can deepen inequality, and why oversight matters.",
  },
];

export function SacramentoAiEthicsSection({ className = "" }: { className?: string }) {
  return (
    <section
      aria-labelledby="sacramento-ai-ethics-title"
      data-testid="section-sacramento-ai-ethics"
      className={`rounded-2xl border border-border bg-card p-5 sm:p-6 ${className}`}
    >
      <p className="mb-1 text-[11px] font-bold uppercase tracking-[.2em] text-primary">Reading list / Sacramento</p>
      <h2 id="sacramento-ai-ethics-title" className="mb-3 text-xl font-bold">AI Ethics</h2>
      <p className="text-sm leading-7 text-muted-foreground">
        In California's capital, technology and public decisions meet. This edition asks who
        benefits from AI, who bears its costs, and how communities can hold automated systems
        accountable. Bring those questions to Sac Tech Week and your next local conversation.
      </p>
      <ol className="mt-4 divide-y divide-border">
        {READINGS.map((reading, index) => (
          <li key={reading.href} className="flex gap-4 py-3">
            <span className="w-6 shrink-0 pt-0.5 text-xs font-bold tabular-nums text-primary">0{index + 1}</span>
            <div className="text-sm leading-6">
              <a href={reading.href} target="_blank" rel="noopener noreferrer"
                data-testid={`link-sacramento-reading-${index}`}
                className="font-semibold text-foreground underline decoration-primary/40 underline-offset-4 hover:decoration-primary">
                {reading.title}
              </a>
              <span className="text-muted-foreground"> / {reading.source}</span>
              <p className="text-muted-foreground">{reading.note}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
