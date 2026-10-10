export function PublicHowItWorks({ citySlug }: { citySlug?: string }) {
  const edition = citySlug ? "/" : "/about#city-editions";
  return (
    <section aria-labelledby="how-it-works" className="mt-10">
      <h2 id="how-it-works" className="mb-3 font-serif text-2xl font-bold text-slate-900">How it works</h2>
      <ol className="list-decimal space-y-3 pl-5 text-slate-700">
        <li><a href={edition} className="font-semibold text-green-800 underline">Choose your city edition</a> for local events and community activities.</li>
        <li>Explore the <a href={edition} className="font-semibold text-green-800 underline">event listings and venues</a>, then follow the official sources to confirm details. Enable JavaScript for interactive maps.</li>
        <li><a href={citySlug ? "/#subscribe" : edition} className="font-semibold text-green-800 underline">Subscribe to the local newsletter</a> for new editions and any personalized attendance or carpool-interest links.</li>
        <li>Use the <a href={edition} className="font-semibold text-green-800 underline">available edition tools</a> to add an event to your calendar, share it, or express interest where supported. Confirm registration with the organizer; these tools do not reserve seats or guarantee rides.</li>
      </ol>
      <h3 className="mb-2 mt-6 font-serif text-xl font-bold text-slate-900">For community curators</h3>
      <p className="text-slate-700">
        Authorized city administrators curate local editions and publish newsletters through their city’s administration tools.
        {" "}<a href={citySlug ? "/admin" : edition} className="font-semibold text-green-800 underline">{citySlug ? "Open city administration" : "Find your city edition"}</a>.
        Publishing access is restricted to authorized administrators, not all visitors.
      </p>
    </section>
  );
}
