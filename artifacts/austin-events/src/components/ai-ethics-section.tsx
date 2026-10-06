export function AiEthicsSection({ className = "" }: { className?: string }) {
  return (
    <section
      aria-labelledby="ai-ethics-title"
      className={`rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6 ${className}`}
    >
      <h2 id="ai-ethics-title" className="mb-3 text-xl font-bold text-slate-900">AI Ethics</h2>
      <p className="text-sm leading-7 text-slate-600">
        AI promises convenience, but what does it cost us in privacy, trust, and human connection?
        My latest post explores that trade-off. For a deeper perspective, Nick Bostrom’s
        {" "}<em>Superintelligence</em> asks how we can keep increasingly powerful AI aligned with
        human values. And 404 Media, founded by former VICE journalists, is must-subscribe media
        for its independent reporting on AI’s real-world impact.
      </p>
      <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-slate-600">
        <li>
          <a href="https://customersuccessforgood.com/2026/09/30/are-we-trading-our-soul-for-convenience/"
            target="_blank" rel="noopener noreferrer"
            className="text-emerald-700 underline underline-offset-4 hover:text-emerald-900">
            Are We Trading Our Soul for Convenience?
          </a>{" "}— Raj’s blog
        </li>
        <li>
          <a href="https://www.404media.co/" target="_blank" rel="noopener noreferrer"
            className="text-emerald-700 underline underline-offset-4 hover:text-emerald-900">
            404 Media
          </a>{" "}— Must-subscribe journalism on AI, privacy, and accountability
        </li>
        <li>
          <a href="https://note.com/akih/n/n1253589b1ffb?hl=en"
            target="_blank" rel="noopener noreferrer"
            className="text-emerald-700 underline underline-offset-4 hover:text-emerald-900">
            Superintelligence: Paths, Dangers, Strategies
          </a>{" "}— Nick Bostrom’s book, featured in Aki’s article
        </li>
      </ul>
    </section>
  );
}