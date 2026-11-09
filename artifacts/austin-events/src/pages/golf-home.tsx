import type { ReactNode } from "react";
import { ArrowDown, ArrowRight, Flag, MapPin, MoveUpRight } from "lucide-react";
import { EventCard } from "../components/event-card";
import "./golf-home.css";

type GolfCourse = { name: string; href: string; imageSrc?: string };

export type GolfHomePageProps = {
  events: any[];
  isEventsLoading: boolean;
  digestId?: number;
  courses: GolfCourse[];
  subscribeForm: ReactNode;
  eventSubmissionForm: ReactNode;
};

function GolfMark() {
  return (
    <span className="golf-mark" aria-hidden="true">
      <Flag size={16} strokeWidth={2.1} />
    </span>
  );
}

export function GolfHomePage({
  events,
  isEventsLoading,
  digestId,
  courses,
  subscribeForm,
  eventSubmissionForm,
}: GolfHomePageProps) {
  return (
    <main className="golf-home">
      <header className="gh-nav">
        <a className="gh-brand" href="#top" aria-label="Golf IRL home">
          <GolfMark />
          <span>GOLF <i>IRL</i></span>
        </a>
        <nav className="gh-nav-links" aria-label="Main navigation">
          <a href="#courses">Places to play</a>
          <a href="#events">Community events</a>
          <a href="#newsletter">The weekly note</a>
        </nav>
        <a className="gh-nav-cta" href="#submit-event">Share an event <ArrowRight size={15} /></a>
      </header>

      <section className="gh-hero" id="top" aria-labelledby="gh-title">
        <div className="gh-hero-contours" aria-hidden="true" />
        <div className="gh-hero-inner">
          <div className="gh-hero-copy">
            <p className="gh-kicker"><span className="gh-live-dot" /> A golf community for Austin</p>
            <h1 id="gh-title">Find your<br /><em>foursome.</em></h1>
            <p className="gh-hero-deck">
              Golf is better when you know who you’re playing with. Find local golf gatherings,
              meet players at every level, and make room for one more.
            </p>
            <div className="gh-hero-actions">
              <a className="gh-button gh-button-coral" href="#events">See what’s on <ArrowRight size={16} /></a>
              <a className="gh-text-link" href="#how-it-works">How it works <ArrowDown size={15} /></a>
            </div>
            <div className="gh-location-note"><MapPin size={15} /> Austin, Texas <span className="gh-note-rule" /> Here for the whole range of golfers</div>
          </div>
          <div className="gh-hero-art" aria-label="Illustration of a golf ball crossing a course">
            <div className="gh-sun" />
            <div className="gh-art-orbit gh-art-orbit-one" />
            <div className="gh-art-orbit gh-art-orbit-two" />
            <div className="gh-hill gh-hill-back" />
            <div className="gh-hill gh-hill-front" />
            <div className="gh-pin"><Flag size={23} fill="currentColor" /></div>
            <div className="gh-ball"><span /></div>
            <span className="gh-art-label gh-art-label-top">AUSTIN, TX</span>
            <span className="gh-art-label gh-art-label-bottom">MEET YOU OUT THERE</span>
          </div>
        </div>
        <a className="gh-scroll-cue" href="#courses"><span>Scroll to explore</span><ArrowDown size={14} /></a>
        <div className="gh-hero-index" aria-hidden="true">01 / GOLF IRL</div>
      </section>

      <section className="gh-course-section gh-section" id="courses" aria-labelledby="gh-courses-title">
        <div className="gh-section-head">
          <div>
            <p className="gh-eyebrow">A good place to start</p>
            <h2 id="gh-courses-title">Where we play<br /><em>around Austin.</em></h2>
          </div>
          <p className="gh-section-intro">
            A few local places to get your bearings. Pick a course, bring a friend, or come meet someone new.
          </p>
        </div>
        {courses.length > 0 ? (
          <div className={`gh-course-grid ${courses.length === 1 ? "gh-course-grid-single" : ""}`}>
            {courses.map((course, index) => (
              <a
                className={`gh-course-card gh-course-card-${index % 3}`}
                href={course.href}
                key={`${course.name}-${course.href}`}
              >
                {course.imageSrc ? (
                  <img src={course.imageSrc} alt="" loading="lazy" />
                ) : (
                  <span className="gh-course-placeholder" aria-hidden="true">
                    <span className="gh-placeholder-sky" />
                    <span className="gh-placeholder-ridge" />
                    <span className="gh-placeholder-green" />
                  </span>
                )}
                <span className="gh-course-overlay">
                  <span className="gh-course-count">LOCAL COURSE</span>
                  <span className="gh-course-name">{course.name}</span>
                  <span className="gh-course-arrow" aria-hidden="true"><MoveUpRight size={17} /></span>
                </span>
              </a>
            ))}
          </div>
        ) : (
          <div className="gh-course-empty">
            <span className="gh-empty-mark"><Flag size={18} /></span>
            <p>Course picks are taking shape.</p>
          </div>
        )}
        <div className="gh-course-caption">
          <span>YOUR NEXT ROUND STARTS SOMEWHERE</span>
          <span>SCROLL ON <ArrowDown size={13} /></span>
        </div>
      </section>

      <section className="gh-events-section gh-section" id="events" aria-labelledby="gh-events-title">
        <div className="gh-section-head gh-events-head">
          <div>
            <p className="gh-eyebrow">The local tee sheet</p>
            <h2 id="gh-events-title">Make a little<br /><em>room on the card.</em></h2>
          </div>
          <div className="gh-events-aside">
            <span className="gh-aside-line" />
            <p>Approved events, open to the community. See something that sounds like your kind of round? Signal your interest and find your people.</p>
          </div>
        </div>
        {isEventsLoading ? (
          <div className="gh-event-grid" aria-label="Loading approved events" aria-busy="true">
            {Array.from({ length: 3 }, (_, index) => (
              <div className="gh-event-skeleton" key={index}>
                <span className="gh-skeleton-shimmer" />
                <span className="gh-skeleton-line gh-skeleton-short" />
                <span className="gh-skeleton-line gh-skeleton-title" />
                <span className="gh-skeleton-line" />
                <span className="gh-skeleton-line gh-skeleton-mid" />
              </div>
            ))}
          </div>
        ) : events.length > 0 ? (
          <div className="gh-event-grid">
            {events.map((event, index) => (
              <div className="gh-event-wrap" key={event?.managedEventId ?? event?.eventId ?? `${event?.title ?? "approved-event"}-${index}`}>
                <EventCard event={event} digestId={digestId} />
              </div>
            ))}
          </div>
        ) : (
          <div className="gh-no-events">
            <span className="gh-no-events-mark"><Flag size={21} /></span>
            <div>
              <h3>No approved events to show just yet.</h3>
              <p>Check back soon, or send in an event for the community to review.</p>
            </div>
            <a className="gh-outline-link" href="#submit-event">Suggest an event <ArrowRight size={15} /></a>
          </div>
        )}
        <p className="gh-event-footnote">Only approved community events appear here.</p>
      </section>

      <section className="gh-how-section gh-section" id="how-it-works" aria-labelledby="gh-how-title">
        <div className="gh-how-heading">
          <p className="gh-eyebrow">No perfect handicap required</p>
          <h2 id="gh-how-title">Golf has room<br />for <em>your kind of game.</em></h2>
          <p>New to the game, getting back into it, or always looking for another round? You belong in the mix.</p>
        </div>
        <div className="gh-principles">
          <article className="gh-principle">
            <span className="gh-principle-number">01</span>
            <div><h3>Find a way in</h3><p>Browse local events and choose the ones that feel right for you.</p></div>
            <span className="gh-principle-mark" aria-hidden="true"><Flag size={17} /></span>
          </article>
          <article className="gh-principle">
            <span className="gh-principle-number">02</span>
            <div><h3>Raise your hand</h3><p>Signal interest on an event to let the community know you’re keen.</p></div>
            <span className="gh-principle-mark" aria-hidden="true"><ArrowRight size={17} /></span>
          </article>
          <article className="gh-principle">
            <span className="gh-principle-number">03</span>
            <div><h3>Bring your game</h3><p>Come as you are. The point is getting out there together.</p></div>
            <span className="gh-principle-mark" aria-hidden="true"><MapPin size={17} /></span>
          </article>
        </div>
      </section>

      <section className="gh-share-section" id="submit-event" aria-labelledby="gh-share-title">
        <div className="gh-share-copy">
          <p className="gh-eyebrow gh-eyebrow-light">Know about a good one?</p>
          <h2 id="gh-share-title">Pass the<br /><em>game on.</em></h2>
          <p>Send an event our way. We’ll review it for the community before it appears on the page.</p>
          <div className="gh-share-stamp"><Flag size={17} /><span>GOOD GOLF<br />GETS SHARED</span></div>
        </div>
        <div className="gh-share-form">{eventSubmissionForm}</div>
      </section>

      <section className="gh-newsletter-section gh-section" id="newsletter" aria-labelledby="gh-news-title">
        <div className="gh-newsletter-copy">
          <p className="gh-eyebrow">A note from the clubhouse</p>
          <h2 id="gh-news-title">Keep your<br /><em>weekend open.</em></h2>
          <p>Get the recurring Golf IRL newsletter with local events and a reason to get out and play.</p>
          <span className="gh-newsletter-aside">A little golf in your inbox. No clubhouse required.</span>
        </div>
        <div className="gh-newsletter-form">{subscribeForm}</div>
      </section>

      <footer className="gh-footer">
        <a className="gh-brand gh-footer-brand" href="#top"><GolfMark /><span>GOLF <i>IRL</i></span></a>
        <p>Austin, Texas <span>·</span> Good golf, better company.</p>
        <a href="#top" className="gh-back-top">Back to the top <ArrowDown size={14} /></a>
      </footer>
    </main>
  );
}
