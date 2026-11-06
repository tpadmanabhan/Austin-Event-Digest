import { useGetCentinelaLocalEvents, getGetCentinelaLocalEventsQueryKey } from "@workspace/api-client-react";
import { ArrowRight, Waves, Sun, Building2, HeartHandshake, Dumbbell, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import "./centinela.css";
import type { CentinelaOfficialLinks } from "./centinela-types";

const amenities = [
  ["Pool", Waves], ["Spa & sauna", Sun], ["Fitness center", Dumbbell],
  ["Clubhouse", Building2], ["Recreation courts", HeartHandshake], ["Secure parking", Building2],
] as const;

function formatEventDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(date);
}

export default function CentinelaHome({ links = {} }: { links?: CentinelaOfficialLinks }) {
  const eventsQuery = useGetCentinelaLocalEvents({
    query: { queryKey: getGetCentinelaLocalEventsQueryKey() },
  });
  const events = eventsQuery.data?.events ?? [];
  const officialLinks = [
    links.community ? ["HOA community page", links.community] : null,
    links.hoa ? ["Resident account", links.hoa] : null,
    links.services ? ["Resident services", links.services] : null,
    links.vendors ? ["Community vendors", links.vendors] : null,
  ].filter((item): item is [string, string] => Boolean(item));

  return <main className="centinela">
    <div className="cv-container">
      <header className="cv-header">
        <Link href="/" className="cv-brand" data-testid="link-centinela-home"><span className="cv-mark" aria-hidden="true">C</span><span className="cv-brand-name">Centinela Ocean View</span><span className="cv-pilot-badge">Pilot</span></Link>
        <nav className="cv-nav" aria-label="Main navigation">
          <a href="#community" data-testid="link-community">Our community</a>
          <a href="#around-us" data-testid="link-local-events">Around us</a>
          <Link href="/sign-in" className="cv-button" data-testid="link-resident-sign-in">Resident sign in <ArrowRight size={14} /></Link>
        </nav>
      </header>
      <section className="cv-hero">
        <div>
          <div className="cv-eyebrow">Mar Vista · Los Angeles</div>
          <h1>A good place<br />to <em>know your neighbors.</em></h1>
          <p className="cv-lede">A home is more than the place you return to. Centinela Ocean View is a community of neighbors making room for conversation, shared moments, and looking out for one another.</p>
          <div className="cv-hero-actions">
            <Link href="/sign-in" className="cv-button" data-testid="link-enter-resident-portal">Enter the resident portal <ArrowRight size={15} /></Link>
            <a href="#community" className="cv-button cv-button--quiet" data-testid="link-learn-community">Get to know us</a>
          </div>
        </div>
        <figure className="cv-photo-wrap">
          <img src="/api/storage/public-objects/centinela/centinela-ocean-view.jpg" alt="Centinela Ocean View community in Mar Vista" data-testid="img-centinela-property" />
          <figcaption className="cv-photo-caption"><span>Centinela Ocean View</span><span>Mar Vista, California</span></figcaption>
        </figure>
      </section>
      <div className="cv-facts" aria-label="Community at a glance" data-testid="section-community-facts">
        <div className="cv-fact"><strong>36</strong><span>residences</span></div>
        <div className="cv-fact"><strong>5</strong><span>stories</span></div>
        <div className="cv-fact"><strong>1990</strong><span>built</span></div>
        <div className="cv-fact"><strong>1</strong><span>shared neighborhood</span></div>
      </div>
    </div>
    <section className="cv-section cv-section--tint" id="community">
      <div className="cv-container">
        <div className="cv-eyebrow">A place to settle in</div>
        <h2>Shared spaces make it easier to feel at home.</h2>
        <p className="cv-section-intro">From a quiet reset to an easy hello, the community has spaces for different rhythms of the day. The best part is what neighbors make of them together.</p>
        <div className="cv-amenities">
          {amenities.map(([name, Icon]) => <div className="cv-amenity" key={name} data-testid={`amenity-${name.toLowerCase().replaceAll(" ", "-")}`}><span className="cv-amenity-mark"><Icon size={16} /></span><span>{name}</span></div>)}
        </div>
      </div>
    </section>
    <section className="cv-section" id="around-us">
      <div className="cv-container">
        <div className="cv-eyebrow">Outside our front door</div>
        <h2>Good things are happening nearby.</h2>
        <p className="cv-section-intro">A small window into public events around Santa Monica, sourced from the local events calendar. These are community listings—not Centinela-hosted activities.</p>
        {eventsQuery.isLoading ? <div className="cv-events" aria-label="Loading public events" data-testid="loading-public-events">{[1,2].map(i => <div className="cv-skeleton" key={i} />)}</div> :
          eventsQuery.isError ? <div className="cv-error" role="alert" data-testid="error-public-events">Nearby events are taking a breather. <button className="cv-button cv-button--quiet" onClick={() => eventsQuery.refetch()} data-testid="button-retry-public-events">Try again</button></div> :
          events.length === 0 ? <div className="cv-empty" data-testid="empty-public-events">No upcoming public listings are available just now. Check back soon.</div> :
          <div className="cv-events" data-testid="list-public-events">
            {events.slice(0, 4).map((event, index) => <article className="cv-event" key={event.id} data-testid={`card-public-event-${event.id}`}>
              <div className="cv-event-meta">{event.category || "Public event"}{event.free ? " · Free" : ""}</div>
              <h3>{event.title}</h3>
              <time dateTime={event.startsAt}>{formatEventDate(event.startsAt)}</time>
              <p>{event.description}</p>
              <div className="cv-event-meta">{event.venue}</div>
              <a href={event.url} target="_blank" rel="noreferrer" data-testid={`link-public-event-${event.id}`}>Event details <ExternalLink size={12} aria-hidden="true" /></a>
              {index === 0 && eventsQuery.data?.sourceUrl && <span className="cv-visually-muted"> · <a href={eventsQuery.data.sourceUrl} target="_blank" rel="noreferrer" data-testid="link-local-events-source">Calendar source</a></span>}
            </article>)}
          </div>}
        {eventsQuery.data?.sourceUrl && <p className="cv-source-note">Public calendar, refreshed {eventsQuery.data.refreshedAt ? formatEventDate(eventsQuery.data.refreshedAt) : "recently"}. <a href={eventsQuery.data.sourceUrl} target="_blank" rel="noreferrer" data-testid="link-public-events-source">View the event source</a>.</p>}
      </div>
    </section>
    <section className="cv-section cv-section--tint">
      <div className="cv-container">
        <div className="cv-eyebrow">For residents</div>
        <h2>Small updates. Shared care. A more connected home.</h2>
        <p className="cv-section-intro">The resident portal brings building notes, neighbor-proposed activities, and the community newsletter into one thoughtful place. Come in, catch up, and add your voice.</p>
        <div className="cv-hero-actions"><Link href="/sign-in" className="cv-button" data-testid="link-resident-portal-cta">Visit the resident portal <ArrowRight size={15} /></Link></div>
      </div>
    </section>
    <footer className="cv-footer"><div className="cv-container cv-footer-inner"><span>Centinela Ocean View · Mar Vista</span><span>Neighbors make a community.</span></div>
      {officialLinks.length > 0 && <div className="cv-container cv-inline-links" aria-label="Official community resources">{officialLinks.map(([label, url]) => <a href={url} target="_blank" rel="noreferrer" key={label} data-testid={`link-official-${label.toLowerCase().replaceAll(" ", "-")}`}>{label}<ExternalLink size={12} /></a>)}</div>}
    </footer>
  </main>;
}
