import type { PublicDocumentModel, PublicEvent } from "@/lib/public-document";
import { displayPublicEventDate, displayPublicWeek, publicCityLabel } from "@/lib/public-document";
import { PublicHowItWorks } from "./public-how-it-works";
import { AiEthicsSection } from "./ai-ethics-section";
import { SfAiEthicsSection } from "./sf-ai-ethics-section";
import { SacramentoAiEthicsSection } from "./sacramento-ai-ethics-section";
import { MiamiAiEthicsSection } from "./miami-ai-ethics-section";
import { BostonAiEthicsSection } from "./boston-ai-ethics-section";
import { LaAiEthicsSection } from "./la-ai-ethics-section";
import { CityAiEthicsSection } from "./city-ai-ethics-section";
import { MiamiFeaturedEvent, isMiamiFeaturedEvent } from "./miami-featured-event";
import { SpockAboutMention } from "./spock-mascot";
import { AlumniHappeningsSection } from "./alumni-happenings-section";
import { LeadershipAlumniTestimonial } from "./leadership-alumni-testimonial";

const wrap = "mx-auto max-w-3xl px-4 py-10 sm:px-6";
const linkCls = "font-semibold text-green-800 underline underline-offset-2 hover:text-green-700";

function EventList({ events, withLinks = true }: { events: PublicEvent[]; withLinks?: boolean }) {
  if (!events.length) return <p className="text-slate-600">No events are listed here yet.</p>;
  const label = (e: PublicEvent) => (e.isBusinessSpotlight ? "Business spotlight" : e.isPost ? "Community spotlight" : e.featured ? "Featured event" : e.category);
  return (
    <ul className="space-y-5">
      {events.map((e) => (
        <li key={e.id} className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-green-800">{label(e)}</p>
          <h3 className="mt-1 font-serif text-xl font-bold text-slate-900">
            {withLinks && e.url ? <a href={e.url} className={linkCls}>{e.title}</a> : e.title}
          </h3>
          <p className="mt-1 text-sm text-slate-600">{displayPublicEventDate(e)}{e.venue ? ` at ${e.venue}` : ""}</p>
          {e.description ? <p className="mt-2 text-slate-700">{e.description}</p> : null}
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {e.url ? <a href={e.url} className={linkCls}>{`Event details for ${e.title}`}</a> : null}
            {e.venueUrl ? <a href={e.venueUrl} className={linkCls}>{`Venue page for ${e.venue}`}</a> : null}
            {e.link ? <a href={e.link} rel="noopener noreferrer" className={linkCls}>{`Official source for ${e.title}`}</a> : null}
          </p>
        </li>
      ))}
    </ul>
  );
}

function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <section aria-labelledby="faq-h" className="mt-12">
      <h2 id="faq-h" className="mb-4 font-serif text-2xl font-bold text-slate-900">Frequently asked questions</h2>
      <dl className="space-y-4">
        {items.map((f) => (
          <div key={f.q}>
            <dt className="font-bold text-slate-900">{f.q}</dt>
            <dd className="text-slate-700">{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function PublicDocumentView({ model }: { model: PublicDocumentModel }) {
  const { kind, event } = model;
  const site = model.siteName || (model.cityName ? `${model.cityName} Events` : "IRL · In Real Life");
  const subscribe = `${model.homeUrl.replace(/#.*$/, "")}#subscribe`;
  const nav = (
    <nav aria-label="Site navigation" className="border-b border-slate-200 bg-slate-50">
      <ul className="mx-auto flex max-w-3xl flex-wrap gap-x-5 gap-y-2 px-4 py-3 text-sm sm:px-6">
        <li><a href={model.homeUrl} className={linkCls}>{`${site} home`}</a></li>
        {model.cities.map((c) => (
          <li key={c.slug}><a href={c.url} className={linkCls}>{publicCityLabel(c)}</a></li>
        ))}
      </ul>
    </nav>
  );

  const miamiFeatured = model.events?.find((e) => isMiamiFeaturedEvent(e, model.citySlug));
  const isMiamiCity = model.citySlug === "miami";
  const isLeadershipAustin = model.citySlug === "leadershipaustin";
  const miamiBusiness = isMiamiCity ? (model.events ?? []).filter((e) => e.isBusinessSpotlight) : [];
  const miamiCommunity = isMiamiCity ? (model.events ?? []).filter((e) => e.isPost && !e.isBusinessSpotlight) : [];
  const listEvents = (model.events ?? [])
    .filter((e) => e !== miamiFeatured && !(isMiamiCity && (e.isBusinessSpotlight || e.isPost)) && !(isLeadershipAustin && (e as PublicEvent & { isAlumniHappening?: boolean }).isAlumniHappening))
    .sort((a, b) => {
      const rank = (e: PublicEvent) => e.isBusinessSpotlight || e.isPost ? 0 : e.featured ? 1 : 2;
      return rank(a) - rank(b);
    });
  const eventIsMiamiFeatured = !!event && isMiamiFeaturedEvent(event, model.citySlug);

  let body;
  if (kind === "event" && event) {
    const when = displayPublicEventDate(event);
    body = (
      <>
        {eventIsMiamiFeatured && <p className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: "#C2452B" }}>Featured event / I’ll be attending</p>}
        <h1 className="font-serif text-3xl font-bold text-slate-900 sm:text-4xl">{event.title}</h1>
        <p className="mt-3 text-lg text-slate-800">
          {`${event.title} takes place ${when}${event.venue ? ` at ${event.venue}` : ""}${model.cityName ? ` in ${model.cityName}` : ""}.`}
        </p>
        <dl className="mt-6 space-y-2 text-slate-700">
          <div><dt className="inline font-bold">Date: </dt><dd className="inline">{when}</dd></div>
          {event.startDate && <div><dt className="inline font-bold">Verified start: </dt><dd className="inline"><time dateTime={event.startDate}>{event.startDate}</time>{event.timezone ? ` (${event.timezone})` : ""}</dd></div>}
          <div>
            <dt className="inline font-bold">Venue: </dt>
            <dd className="inline">
              {event.venueUrl ? <a href={event.venueUrl} className={linkCls}>{event.venue}</a> : event.venue}
              {event.venueAddress ? `, ${event.venueAddress}` : ""}
            </dd>
          </div>
          {event.link ? (
            <div><dt className="inline font-bold">Official link: </dt><dd className="inline"><a href={event.link} rel="noopener noreferrer" className={linkCls}>{`Official page for ${event.title}`}</a></dd></div>
          ) : null}
        </dl>
        {event.description ? <p className="mt-6 text-slate-700">{event.description}</p> : null}
        <p className="mt-8"><a href={subscribe} className="inline-block rounded-full bg-green-800 px-6 py-3 font-semibold text-white">{`Subscribe to the ${model.cityName || site} newsletter`}</a></p>
        <Faq items={[
          { q: "Can I find a carpool for this event?", a: "Use the personalized attendance and carpool-interest links in the city digest when available. Enabled features can connect opt-in attendees, but do not book or guarantee rides." },
          { q: "Where do I confirm the details?", a: event.link ? "Use the official link on this page to confirm date, time and tickets." : "Check with the organizer, as no official link was provided." },
        ]} />
      </>
    );
  } else if (kind === "venue") {
    body = (
      <>
        <h1 className="font-serif text-3xl font-bold text-slate-900 sm:text-4xl">{model.venueName || model.title}</h1>
        <p className="mt-3 text-lg text-slate-800">{model.description}</p>
        <h2 className="mb-4 mt-10 font-serif text-2xl font-bold text-slate-900">Events at this venue</h2>
        <EventList events={model.events} />
        <Faq items={[{ q: "How do I get to this venue?", a: "Visit the organizer or official source link for each event to find verified travel and parking details. This page does not list transport directions." }]} />
      </>
    );
  } else if (kind === "city" || kind === "digest" || kind === "deals") {
    body = (
      <>
        <h1 className="font-serif text-3xl font-bold text-slate-900 sm:text-4xl">{isLeadershipAustin ? "Leadership Austin" : model.title}</h1>
        {!isLeadershipAustin && model.editionRange
          ? <p className="mt-2 text-sm font-bold uppercase tracking-widest text-green-800">{`Upcoming events · ${model.editionRange}`}</p>
          : !isLeadershipAustin && model.weekOf ? <p className="mt-2 text-sm font-bold uppercase tracking-widest text-green-800">{`Week of ${displayPublicWeek(model.weekOf)}`}</p> : null}
        <p className="mt-3 text-lg text-slate-800">{isLeadershipAustin ? "A monthly newsletter of upcoming events for Leadership Austin alumni and the Austin community." : model.intro || model.description}</p>
        {isLeadershipAustin && <LeadershipAlumniTestimonial profiles={model.leadershipClassProfiles} />}
        {isLeadershipAustin && (
          <div className="mt-8 space-y-5">
            <AlumniHappeningsSection events={(model.events ?? []) as any[]} compact />
          </div>
        )}
        {!isLeadershipAustin && model.citySlug === "austin" && <AiEthicsSection className="mt-6" />}
        {model.citySlug === "sanfrancisco" && <SfAiEthicsSection className="mt-6" />}
        {model.citySlug === "sacramento" && <SacramentoAiEthicsSection className="mt-6" />}
        {model.citySlug === "miami" && <MiamiAiEthicsSection className="mt-6" />}
        {model.citySlug === "boston" && <BostonAiEthicsSection className="mt-6" />}
        {model.citySlug === "la" && <LaAiEthicsSection className="mt-6" />}
        {model.citySlug && !isLeadershipAustin && <CityAiEthicsSection slug={model.citySlug} className="mt-6" />}
        {miamiBusiness.length > 0 && (
          <section aria-labelledby="miami-business-h" className="mt-10">
            <h2 id="miami-business-h" className="mb-4 font-serif text-2xl font-bold text-slate-900">Business Spotlight</h2>
            <EventList events={miamiBusiness} />
          </section>
        )}
        {miamiCommunity.length > 0 && (
          <section aria-labelledby="miami-community-h" className="mt-10">
            <h2 id="miami-community-h" className="mb-4 font-serif text-2xl font-bold text-slate-900">Community Spotlight</h2>
            <EventList events={miamiCommunity} />
          </section>
        )}
        {miamiFeatured && <MiamiFeaturedEvent event={miamiFeatured} digestId={model.digestId} className="mt-10" />}
      <h2 className="mb-4 mt-10 font-serif text-2xl font-bold text-slate-900">{kind === "deals" ? "Local deals" : model.editionRange || isLeadershipAustin ? "Upcoming events" : "Events this week"}</h2>
        <EventList events={listEvents} />
        {isLeadershipAustin && kind === "digest" && (
          <section aria-labelledby="public-event-contribution-title" className="mt-8 flex flex-col gap-4 rounded-2xl border border-[#314363]/20 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="public-event-contribution-title" className="font-serif text-xl font-bold text-[#314363]">
                Know an event the community should see?
              </h2>
              <p className="mt-1 text-sm text-slate-700">
                Active Leadership Austin subscribers can suggest events for admin review.
              </p>
            </div>
            <a
              href={`${model.homeUrl.replace(/\/+$/, "")}${model.digestId ? `/digest/${model.digestId}` : ""}#add-event`}
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#314363] px-5 py-3 text-sm font-bold text-white no-underline"
            >
              Suggest a community event
            </a>
          </section>
        )}
        <p className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
          {model.editionUrl ? (
            <a
              href={model.editionUrl}
              className={isLeadershipAustin && kind === "city"
                ? "inline-flex w-full items-center justify-center rounded-2xl border-2 border-[#4EBEE7] bg-[#314363] px-8 py-4 text-lg font-extrabold text-white shadow-xl shadow-[#314363]/25 sm:w-auto"
                : linkCls}
            >
              {isLeadershipAustin && kind === "city" ? (
                <span className="flex flex-col items-start leading-tight">
                  <span className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-[#8bd8f0]">Latest edition</span>
                  <span>{`Read the full ${model.cityName || ""} edition`}</span>
                </span>
              ) : `Read the full ${model.cityName || ""} edition`}
            </a>
          ) : null}
          <a href={subscribe} className={linkCls}>{isLeadershipAustin ? "Subscribe to the monthly newsletter" : "Subscribe to the newsletter"}</a>
        </p>
      </>
    );
  } else if (kind === "platform") {
    body = (
      <>
        <h1 className="font-serif text-3xl font-bold text-slate-900 sm:text-4xl">Make room for the real.</h1>
        <p className="mt-3 text-lg text-slate-800">
          Discover worthwhile events, local stories, and city newsletters, and find a good reason to step out into your city.
        </p>
        <p className="mt-3 text-slate-700">
          Every edition has its own point of view. Explore the city directory to see what is happening near you, including <a href="https://austin.irl.group" className={linkCls}>Raj’s Austin Events</a>.
        </p>
        <h2 id="city-editions" className="mb-3 mt-8 font-serif text-2xl font-bold text-slate-900">City newsletters</h2>
        <ul className="space-y-2">
          {model.cities.map((city) => (
            <li key={city.slug}>
              <a href={city.url} className={linkCls}>{publicCityLabel(city)}</a>
            </li>
          ))}
        </ul>
        <p className="mt-4">
          <a href="https://austincares.irl.group" className={linkCls}>Explore AustinCares local deals</a>
        </p>
        <section aria-labelledby="platform-ai-ethics" className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="platform-ai-ethics" className="font-serif text-2xl font-bold text-slate-900">Local AI Ethics</h2>
              <p className="mt-2 text-slate-700">
                Explore AI ethics resources connected to city policy, research and local conversations. For cities without a dedicated resource listed, visit the city edition for local updates.
              </p>
            </div>
            <img src="/images/intelligence-integrity.png" alt="Intelligence with integrity" className="h-auto w-40 rounded-md" />
          </div>
          <ul className="mt-4 space-y-2">
            {model.cities.map((city) => (
              <li key={`ethics-${city.slug}`}>
                <span className="font-semibold">{city.name}: </span>
                <a href={city.ethicsUrl || city.url} className={linkCls}>{city.ethicsTitle || `Explore the ${city.name} edition for local updates`}</a>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="request-city-public" className="mt-8 border-t border-slate-200 pt-6">
          <h2 id="request-city-public" className="font-serif text-2xl font-bold text-slate-900">Suggest a city</h2>
          <p className="mt-2 text-slate-700">
            If your city is not listed, the interactive page lets you submit its name and your email address. The team reviews each request; submitting one does not automatically launch a city.
          </p>
          <p className="mt-3"><a href="#city-editions" className={linkCls}>Browse available city editions</a></p>
        </section>
        <SpockAboutMention className="mt-8" />
      </>
    );
  } else if (kind === "about") {
    body = (
      <>
        <h1 className="font-serif text-3xl font-bold text-slate-900 sm:text-4xl">{model.title}</h1>
        <p className="mt-3 text-lg text-slate-800">{model.description}</p>
        <h2 className="mb-3 mt-10 font-serif text-2xl font-bold text-slate-900">What you get</h2>
        <ul className="list-disc space-y-2 pl-5 text-slate-700">
          <li>City editions of curated weekly events.</li>
          <li>Maps of event venues.</li>
          <li>Local newsletters for each city.</li>
          <li>RSVP and calendar tools where an event supports them.</li>
          <li>Carpool interest links where enabled. These are not ride bookings or guarantees.</li>
          <li>A localized Tokyo edition.</li>
          <li>AustinCares, a distinct guide to local deals.</li>
        </ul>
        <SpockAboutMention className="mt-8" />
        <PublicHowItWorks citySlug={model.citySlug} />
        <h2 id="city-editions" className="mb-3 mt-10 font-serif text-2xl font-bold text-slate-900">City editions</h2>
        <ul className="space-y-2">
          {model.cities.map((c) => (
            <li key={c.slug}><a href={c.url} className={linkCls}>{publicCityLabel(c)}</a></li>
          ))}
        </ul>
        <Faq items={[{
          q: "Is this a ride service?",
          a: model.citySlug
            ? "No. EventCarpooling connects communities through local events and available carpool-interest tools; it does not book or guarantee rides."
            : "No. In Real Life helps people discover local events and offers carpool-interest tools only where enabled; it does not book or guarantee rides.",
        }]} />
      </>
    );
  } else {
    const msg = kind === "private" ? "This page is private." : kind === "unavailable" ? "This page is temporarily unavailable." : "We could not find that page.";
    body = (
      <>
        <h1 className="font-serif text-3xl font-bold text-slate-900">{model.title}</h1>
        <p className="mt-3 text-lg text-slate-800">{model.description || msg}</p>
        <p className="mt-6"><a href={model.homeUrl} className={linkCls}>{`Back to ${site} home`}</a></p>
      </>
    );
  }

  return (
    <div data-tenant={isLeadershipAustin ? "leadershipaustin" : undefined} className={`min-h-[100dvh] ${isLeadershipAustin ? "bg-background text-foreground" : "bg-slate-50 text-slate-900"}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:bg-white focus:p-2">Skip to content</a>
      {nav}
      <main id="main" className={wrap}>{body}
        {["city", "digest", "deals"].includes(kind) && (
          <section id="subscribe" className="mt-10 border-t border-slate-200 pt-6">
            <h2 className="font-serif text-2xl font-bold">Subscribe and explore the map</h2>
            <p className="mt-3 text-slate-700">Enable JavaScript to use this edition's existing signup form and interactive map. The event listings and official source links above are available without JavaScript.</p>
          </section>
        )}
      </main>
      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <a href="https://irl.group" aria-label="IRL — In Real Life">
            <img
              src="/images/irl-monogram.png"
              alt="IRL — In Real Life"
              width="84"
              height="84"
              loading="lazy"
              decoding="async"
              className="h-[84px] w-[84px] rounded-xl object-contain"
            />
          </a>
          <a href={model.canonical} className={linkCls}>{site}</a>
        </div>
      </footer>
    </div>
  );
}

export default PublicDocumentView;
