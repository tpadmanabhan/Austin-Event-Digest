export function AiEthicsSection({ className = "" }: { className?: string }) {
  return (
    <section
      aria-labelledby="ai-ethics-title"
      className={`rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6 ${className}`}
    >
      <h2 id="ai-ethics-title" className="mb-3 text-xl font-bold text-slate-900">AI Ethics</h2>
      <p className="text-sm leading-7 text-slate-600">
        Responsible technology should make digital experiences easier to use, support real-world
        connection, and be built around the people it serves. This week, I’m connecting those
        ideas to my website rebuild, a story about community builders, and a sports-tech hackathon.
      </p>
      <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-slate-600">
        <li>
          <a href="https://eventcarpooling.com/"
            target="_blank" rel="noopener noreferrer"
            className="text-emerald-700 underline underline-offset-4 hover:text-emerald-900">
            Rebuilding EventCarpooling.com for a better user experience
          </a>{" "}— I’m improving the site so finding local events feels clearer and easier.
        </li>
        <li>
          <a href="https://www.theatlantic.com/health/2026/10/community-builders/688947/"
            target="_blank" rel="noopener noreferrer"
            className="text-emerald-700 underline underline-offset-4 hover:text-emerald-900">
            The Rise of the IRL Influencer
          </a>{" "}— Nancy Walecki on community builders bringing people together offline.
        </li>
        <li>
          <a href="https://luma.com/i1m74hz4"
            target="_blank" rel="noopener noreferrer"
            className="text-emerald-700 underline underline-offset-4 hover:text-emerald-900">
            Spurs² Hackathon @ UT Austin
          </a>{" "}— I’m participating in a hackathon with the San Antonio Spurs and partners to build AI-powered sports media tools.
        </li>
        <li>
          <a href="https://eventcarpooling.com/"
            target="_blank" rel="noopener noreferrer"
            className="text-emerald-700 underline underline-offset-4 hover:text-emerald-900">
            Want an event page for your city?
          </a>{" "}— Make a request; customization is also considered for each city.
        </li>
      </ul>
    </section>
  );
}