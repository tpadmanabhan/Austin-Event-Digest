import { useState } from "react";
import type { ReactNode } from "react";
import { ArrowDown, ArrowRight, Flag, Mail, MapPin, MoveUpRight } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { GOLF_HOME_COPY } from "@/i18n/golf-home";
import { GolfCourseRequestModal } from "@/components/golf-course-request-modal";
import { EventCard } from "../components/event-card";
import "./golf-home.css";

type GolfCourse = { name: string; href: string; imageSrc?: string; imageAlt?: string };
type GolfSpotlight = {
  type: "business" | "community";
  title: string;
  description: string;
  link: string;
  imageSrc?: string;
  imageAlt?: string;
};

const golfHeroImage = `${import.meta.env.BASE_URL}golf-events/golf-course-hero.png`;

export type GolfHomePageProps = {
  events: any[];
  spotlights: GolfSpotlight[];
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
  spotlights,
  isEventsLoading,
  digestId,
  courses,
  subscribeForm,
  eventSubmissionForm,
}: GolfHomePageProps) {
  const { lang, setLang } = useLanguage();
  const copy = GOLF_HOME_COPY[lang];
  const [isCourseRequestOpen, setIsCourseRequestOpen] = useState(false);

  return (
    <main className={`golf-home${lang === "ja" ? " golf-home-ja" : ""}`}>
      <header className="gh-nav">
        <a className="gh-brand" href="#top" aria-label={lang === "ja" ? "Golf IRLホーム" : "Golf IRL home"}>
          <GolfMark />
          <span>GOLF <i>IRL</i></span>
        </a>
        <nav className="gh-nav-links" aria-label={lang === "ja" ? "メインナビゲーション" : "Main navigation"}>
          <a href="#courses">{copy.navCourses}</a>
          <a href="#events">{copy.navEvents}</a>
          <a href="#newsletter">{copy.navNewsletter}</a>
        </nav>
        <div className="gh-nav-actions">
          <button
            type="button"
            className="gh-language-toggle"
            aria-label={copy.toggleLabel}
            onClick={() => setLang(lang === "en" ? "ja" : "en")}
          >
            {lang === "ja" ? "English" : "日本語"}
          </button>
          <a className="gh-nav-cta" href="#submit-event">{copy.navShareEvent} <ArrowRight size={15} /></a>
          <a
            className="gh-subscribe-cta"
            href="#newsletter"
            aria-label={copy.navSubscribe}
            data-testid="link-subscribe-newsletter"
          >
            <Mail size={14} aria-hidden="true" />
            {copy.navSubscribe}
          </a>
        </div>
      </header>

      <section className="gh-hero" id="top" aria-labelledby="gh-title">
        <div className="gh-hero-contours" aria-hidden="true" />
        <div className="gh-hero-inner">
          <div className="gh-hero-copy">
            <p className="gh-kicker"><span className="gh-live-dot" /> {copy.heroKicker}</p>
            <h1 id="gh-title">{copy.heroTitleFirst}<br /><em>{copy.heroTitleSecond}</em></h1>
            <p className="gh-hero-deck">{copy.heroDescription}</p>
            <div className="gh-hero-actions">
              <a className="gh-button gh-button-coral" href="#events">{copy.heroSeeEvents} <ArrowRight size={16} /></a>
              <a className="gh-text-link" href="#how-it-works">{copy.heroHowItWorks} <ArrowDown size={15} /></a>
            </div>
            <div className="gh-location-note"><MapPin size={15} /> {copy.city} <span className="gh-note-rule" /> {copy.golferWelcome}</div>
          </div>
          <div className="gh-hero-art">
            <img className="gh-hero-photo" src={golfHeroImage} alt={copy.heroArtAlt} />
          </div>
        </div>
        <a className="gh-scroll-cue" href="#courses"><span>{copy.scrollExplore}</span><ArrowDown size={14} /></a>
        <div className="gh-hero-index" aria-hidden="true">01 / GOLF IRL</div>
      </section>

      <section className="gh-course-section gh-section" id="courses" aria-labelledby="gh-courses-title">
        <div className="gh-section-head">
          <div>
            <p className="gh-eyebrow">{copy.courseEyebrow}</p>
            <h2 id="gh-courses-title">{copy.courseTitleFirst}<br /><em>{copy.courseTitleSecond}</em></h2>
          </div>
          <p className="gh-section-intro">{copy.courseIntro}</p>
        </div>
        {courses.length > 0 ? (
          <div className={`gh-course-grid ${courses.length === 1 ? "gh-course-grid-single" : ""}`}>
            {courses.map((course, index) => (
              <a
                className={`gh-course-card gh-course-card-${courses.length === 5 ? index % 3 : index % 2}`}
                href={course.href}
                key={`${course.name}-${course.href}`}
              >
                {course.imageSrc ? (
                  <img src={course.imageSrc} alt={course.imageAlt ?? ""} loading="lazy" decoding="async" />
                ) : (
                  <span className="gh-course-placeholder" aria-hidden="true">
                    <span className="gh-placeholder-sky" />
                    <span className="gh-placeholder-ridge" />
                    <span className="gh-placeholder-green" />
                  </span>
                )}
                <span className="gh-course-overlay">
                  <span className="gh-course-count">{copy.localCourse}</span>
                  <span className="gh-course-name">{course.name}</span>
                  <span className="gh-course-arrow" aria-hidden="true"><MoveUpRight size={17} /></span>
                </span>
              </a>
            ))}
          </div>
        ) : (
          <div className="gh-course-empty">
            <span className="gh-empty-mark"><Flag size={18} /></span>
            <p>{copy.courseEmpty}</p>
          </div>
        )}
        <p className="gh-course-more-note">{copy.moreCourses}</p>
        <div className="gh-course-request">
          <div>
            <p className="gh-course-request-eyebrow">{copy.courseRequest.eyebrow}</p>
            <p className="gh-course-request-description">{copy.courseRequest.description}</p>
          </div>
          <button
            type="button"
            className="gh-course-request-button"
            onClick={() => setIsCourseRequestOpen(true)}
            data-testid="button-suggest-golf-course"
          >
            {copy.courseRequest.button} <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
        <div className="gh-course-caption">
          <span>{copy.courseCaption}</span>
          <span>{copy.scrollOn} <ArrowDown size={13} /></span>
        </div>
      </section>

      {spotlights.length > 0 && (
        <section className="gh-spotlights-section gh-section" aria-labelledby="gh-spotlights-title">
          <div className="gh-section-head">
            <div>
              <p className="gh-eyebrow">{copy.spotlightsEyebrow}</p>
              <h2 id="gh-spotlights-title">{copy.spotlightsTitle}</h2>
            </div>
          </div>
          <div className="gh-spotlight-grid">
            {spotlights.slice(0, 2).map((spotlight) => (
              <a
                className={`gh-spotlight-card gh-spotlight-${spotlight.type}`}
                href={spotlight.link}
                key={`${spotlight.type}-${spotlight.link}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {spotlight.imageSrc && (
                  <span className={`gh-spotlight-visual gh-spotlight-visual-${spotlight.type}`}>
                    <img
                      src={spotlight.imageSrc}
                      alt={spotlight.imageAlt ?? ""}
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                )}
                <span className="gh-spotlight-copy">
                  <span className="gh-spotlight-label">
                    {spotlight.type === "business" ? copy.businessSpotlight : copy.communitySpotlight}
                  </span>
                  <span className="gh-spotlight-title">{spotlight.title}</span>
                  <span className="gh-spotlight-description">{spotlight.description}</span>
                  <span className="gh-spotlight-link">{copy.visitSpotlight} <MoveUpRight size={14} /></span>
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="gh-events-section gh-section" id="events" aria-labelledby="gh-events-title">
        <div className="gh-section-head gh-events-head">
          <div>
            <p className="gh-eyebrow">{copy.eventsEyebrow}</p>
            <h2 id="gh-events-title">{copy.eventsTitleFirst}<br /><em>{copy.eventsTitleSecond}</em></h2>
          </div>
          <div className="gh-events-aside">
            <span className="gh-aside-line" />
            <p>{copy.eventsAside}</p>
          </div>
        </div>
        {isEventsLoading ? (
          <div className="gh-event-grid" aria-label={copy.loadingEvents} aria-busy="true">
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
            {events.slice(0, 3).map((event, index) => (
              <div className="gh-event-wrap" key={event?.managedEventId ?? event?.eventId ?? `${event?.title ?? "approved-event"}-${index}`}>
                <EventCard event={event} digestId={digestId} />
              </div>
            ))}
          </div>
        ) : (
          <div className="gh-no-events">
            <span className="gh-no-events-mark"><Flag size={21} /></span>
            <div>
              <h3>{copy.noEventsTitle}</h3>
              <p>{copy.noEventsDescription}</p>
            </div>
            <a className="gh-outline-link" href="#submit-event">{copy.suggestEvent} <ArrowRight size={15} /></a>
          </div>
        )}
        <p className="gh-event-footnote">{copy.approvedEventsNote}</p>
        {digestId && (
          <a className="gh-full-edition-link" href={`${import.meta.env.BASE_URL}digest/${digestId}`}>
            {copy.fullEdition} <ArrowRight size={15} />
          </a>
        )}
      </section>

      <section className="gh-how-section gh-section" id="how-it-works" aria-labelledby="gh-how-title">
        <div className="gh-how-heading">
          <p className="gh-eyebrow">{copy.howEyebrow}</p>
          <h2 id="gh-how-title">{copy.howTitleFirst}<br /><em>{copy.howTitleSecond}</em></h2>
          <p>{copy.howIntro}</p>
        </div>
        <div className="gh-principles">
          {copy.principles.map((principle, index) => {
            const Mark = [Flag, ArrowRight, MapPin][index];
            return (
              <article className="gh-principle" key={principle.title}>
                <span className="gh-principle-number">{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{principle.title}</h3><p>{principle.description}</p></div>
                <span className="gh-principle-mark" aria-hidden="true"><Mark size={17} /></span>
              </article>
            );
          })}
        </div>
      </section>

      <section className="gh-share-section" id="submit-event" aria-labelledby="gh-share-title">
        <div className="gh-share-copy">
          <p className="gh-eyebrow gh-eyebrow-light">{copy.shareEyebrow}</p>
          <h2 id="gh-share-title">{copy.shareTitleFirst}<br /><em>{copy.shareTitleSecond}</em></h2>
          <p>{copy.shareDescription}</p>
          <div className="gh-share-stamp"><Flag size={17} /><span>{copy.shareStampFirst}<br />{copy.shareStampSecond}</span></div>
        </div>
        <div className="gh-share-form">{eventSubmissionForm}</div>
      </section>

      <section className="gh-newsletter-section gh-section" id="newsletter" aria-labelledby="gh-news-title">
        <div className="gh-newsletter-copy">
          <p className="gh-eyebrow">{copy.newsletterEyebrow}</p>
          <h2 id="gh-news-title">{copy.newsletterTitleFirst}<br /><em>{copy.newsletterTitleSecond}</em></h2>
          <p>{copy.newsletterDescription}</p>
          <span className="gh-newsletter-aside">{copy.newsletterAside}</span>
        </div>
        <div className="gh-newsletter-form">{subscribeForm}</div>
      </section>

      <footer className="gh-footer">
        <a className="gh-brand gh-footer-brand" href="#top"><GolfMark /><span>GOLF <i>IRL</i></span></a>
        <p>{copy.city} <span>·</span> {copy.footerTagline}</p>
        <a href="#top" className="gh-back-top">{copy.backToTop} <ArrowDown size={14} /></a>
      </footer>
      <GolfCourseRequestModal open={isCourseRequestOpen} onOpenChange={setIsCourseRequestOpen} />
    </main>
  );
}
