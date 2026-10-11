export function AiEthicsSection({ className = "" }: { className?: string }) {
  return (
    <section
      aria-labelledby="ai-ethics-title"
      className={`rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6 ${className}`}
    >
      <h2 id="ai-ethics-title" className="mb-3 text-xl font-bold text-slate-900">AI Ethics</h2>
      <p className="text-sm leading-7 text-slate-600">
        AI can help us plan, but it cannot replace friends, new experiences, or time outside.
        My latest post explores why human connection and real-life curiosity still matter.
        Dan Harris’s podcast offers simple ways to calm the nervous system—and asks why
        scrolling is not the same as rest. Sanjay Gupta explores the promise and risks of
        giving AI our medical records. For an IRL leadership perspective, Admiral William
        H. McRaven’s <em>The Wisdom of the Bullfrog</em> brings the focus back to character,
        responsibility, and showing up for others. Use technology to help you get out there,
        not keep you scrolling.
      </p>
      <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-slate-600">
        <li>
          <a href="https://customersuccessforgood.com/2026/10/07/ai-doesnt-solve-this/"
            target="_blank" rel="noopener noreferrer"
            className="text-emerald-700 underline underline-offset-4 hover:text-emerald-900">
            AI Doesn’t Solve This
          </a>{" "}— Raj’s blog
        </li>
        <li>
          <a href="https://podcasts.apple.com/us/podcast/10-happier-with-dan-harris/id1087147821?i=1000793503590" target="_blank" rel="noopener noreferrer"
            className="text-emerald-700 underline underline-offset-4 hover:text-emerald-900">
            10% Happier with Dan Harris
          </a>{" "}— Calm Your Nervous System: simple daily practices with Nadia Narain and Katia Narain Phillips
        </li>
        <li>
          <a href="https://podcasts.apple.com/us/podcast/chasing-life-with-dr-sanjay-gupta/id1501029683?i=1000791424717"
            target="_blank" rel="noopener noreferrer"
            className="text-emerald-700 underline underline-offset-4 hover:text-emerald-900">
            Chasing Life with Dr. Sanjay Gupta
          </a>{" "}— Should You Give AI Your Medical Records? Sanjay Did.
        </li>
        <li>
          <a href="https://www.amazon.com/Wisdom-Bullfrog-Leadership-Made-Simple/dp/1538707942"
            target="_blank" rel="noopener noreferrer"
            className="text-emerald-700 underline underline-offset-4 hover:text-emerald-900">
            IRL Lifestyle Book of the Week: The Wisdom of the Bullfrog
          </a>{" "}— Leadership Made Simple (But Not Easy), by Admiral William H. McRaven
        </li>
      </ul>
    </section>
  );
}