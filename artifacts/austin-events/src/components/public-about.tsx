import { PublicHowItWorks } from "./public-how-it-works";
import { SpockAboutMention } from "./spock-mascot";

const TOPICS = [
  { h: "City editions", p: "Each city has its own edition with a weekly list of hand-picked events, written for that neighborhood and linked back to the official source." },
  { h: "Maps", p: "Edition pages show event venues on a map so you can see what is close to you." },
  { h: "Local newsletters", p: "Subscribe to a city's newsletter and get that week's edition by email." },
  { h: "RSVP and calendar", p: "Where an event supports it, you can RSVP and add it to your calendar." },
  { h: "Carpool interest", p: "Where enabled, personalized attendance and carpool-interest tools can connect opt-in neighbors. EventCarpooling does not book or guarantee rides." },
  { h: "Tokyo localization", p: "The Tokyo edition is localized for its readers, with Japanese-language presentation of the guide." },
  { h: "AustinCares local deals", p: "AustinCares is a separate local deals guide for Austin businesses, sorted by day and neighborhood. It is distinct from the event editions." },
];

export function PublicAbout() {
  return (
    <section aria-labelledby="about-heading" className="bg-white py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h2 id="about-heading" className="mb-3 font-serif text-3xl font-bold text-slate-900">About EventCarpooling</h2>
        <p className="mb-8 max-w-2xl text-slate-600">
          EventCarpooling is a neighborhood-focused, multi-city guide that connects people through curated events, local newsletters, and available carpool-interest tools.
        </p>
        <dl className="grid gap-6 sm:grid-cols-2">
          {TOPICS.map((t) => (
            <div key={t.h} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <dt className="mb-1 font-serif text-lg font-bold text-slate-900">{t.h}</dt>
              <dd className="text-sm leading-relaxed text-slate-600">{t.p}</dd>
            </div>
          ))}
        </dl>
        <SpockAboutMention className="mt-6" />
        <PublicHowItWorks />
      </div>
    </section>
  );
}

export default PublicAbout;
