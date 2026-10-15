import "./_group.css";
import "./platform-home.css";
import { useState } from "react";
import { ArrowDown, ArrowRight, ExternalLink, MapPin, Newspaper } from "lucide-react";

const NEW_CITY_SLUGS = ["atlanta", "sanfrancisco", "austin", "sacramento", "miami", "boston"];
const CITIES = [
  { slug: "boston", name: "Boston Events", city: "Boston", image: "/api/storage/public-objects/cities/boston/hero.jpg", alt: "Boston city view" },
  { slug: "atlanta", name: "Atlanta Events", city: "Atlanta", image: "/__mockup/images/atlanta-hero.svg", alt: "Atlanta city illustration" },
  { slug: "sanfrancisco", name: "San Francisco Events", city: "San Francisco", image: "/__mockup/images/sanfrancisco-hero.jpg", alt: "San Francisco city view" },
  { slug: "austin", name: "Raj's Austin Events", city: "Austin", image: "/__mockup/images/austin-hero.png", alt: "Austin city view" },
  { slug: "sacramento", name: "Sacramento Events", city: "Sacramento", image: "/__mockup/images/sacramento-hero.jpg", alt: "Sacramento city view" },
  { slug: "miami", name: "Miami Events", city: "Miami", image: "/api/storage/public-objects/cities/miami/hero.jpg", alt: "Miami waterfront skyline and beach" },
  { slug: "houston", name: "Houston Events", city: "Houston", image: "/__mockup/images/houston-dusk.jpg", alt: "Houston skyline at dusk" },
  { slug: "tokyo", name: "Tokyo Events", city: "Tokyo", image: "/__mockup/images/tokyo-city.jpg", alt: "Tokyo skyline glowing at twilight" },
  { slug: "stlouis", name: "St. Louis Events", city: "St. Louis", image: "/__mockup/images/stlouis-hero.jpg", alt: "St. Louis city view" },
  { slug: "portland", name: "Portland Events", city: "Portland", image: "/__mockup/images/portland-city.jpg", alt: "Portland skyline reflected across the Willamette River" },
  { slug: "bulverde", name: "Bulverde Events", city: "Bulverde", image: "/__mockup/images/bulverde-hero.jpg", alt: "Bulverde landscape" },
  { slug: "dc", name: "DC Events", city: "Washington, DC", image: "/__mockup/images/dc-hero.jpg", alt: "Washington, DC city view" },
];
const ETHICS: Record<string, { href: string; label: string }> = {
  boston: { href: "https://www.boston.gov/government/cabinets/innovation-and-technology/city-boston-generative-artificial-intelligence-gen-ai", label: "Boston’s generative AI policy" },
  sanfrancisco: { href: "https://hai.stanford.edu/ai-index/2026-ai-index-report", label: "Stanford HAI AI Index 2026" },
  austin: { href: "https://customersuccessforgood.com/2026/10/07/ai-doesnt-solve-this/", label: "AI Doesn’t Solve This" },
  sacramento: { href: "https://www.nist.gov/itl/ai-risk-management-framework", label: "NIST AI Risk Management Framework" },
  miami: { href: "https://algorithmsofoppression.com/about/", label: "Algorithms of Oppression" },
};

function NewBadge() {
  return <span className="inline-flex shrink-0 rounded-full bg-[#dcfce7] px-2 py-0.5 text-xs font-bold text-[#166534]">New</span>;
}

export function Simplified() {
  const [requestOpen, setRequestOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [language, setLanguage] = useState<"en" | "ja">("en");
  const sorted = CITIES;

  function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  function closeRequest() {
    setRequestOpen(false);
    setSubmitted(false);
    setCity("");
    setEmail("");
  }

  return (
    <div className="min-h-screen bg-[#fbfaf5] text-[#20332d]">
      <header className="sticky top-0 z-30 border-b border-[#e0e3da] bg-[#fbfaf5]/95 backdrop-blur">
        <div className="mx-auto flex h-[66px] max-w-[1180px] items-center justify-between px-5">
          <a href="#top" className="flex items-center gap-2.5 text-[#29473b] no-underline">
            <span className="grid h-8 w-8 place-items-center border border-[#31594b] font-serif text-lg">e</span>
            <span className="text-[13px] font-bold tracking-[.08em]">EVENTCARPOOLING</span>
          </a>
          <nav className="flex items-center gap-3">
            <button className="rounded-full border border-[#dce2d8] px-3 py-1.5 text-[11px] font-semibold text-[#557063]" type="button" onClick={() => setLanguage(language === "en" ? "ja" : "en")} aria-label="Toggle language">
              {language === "en" ? "日本語" : "English"}
            </button>
            <a href="#city-directory" className="hidden text-xs font-semibold text-[#557063] no-underline sm:inline">Cities</a>
            <button className="button-primary !min-h-9 !px-3.5 !text-xs" type="button" onClick={() => setRequestOpen(true)}>
              {language === "en" ? "Request your city" : "あなたの街をリクエスト"}
            </button>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="platform-hero">
          <div className="platform-hero-inner">
            <div className="hero-copy">
              <div className="hero-kicker"><span className="kicker-rule" /> A local editor in your inbox</div>
              <h1>Event Newsletter<br /><em>in an Hour.</em></h1>
              <p className="hero-description">A simple way to find worthwhile things happening nearby. Browse your city’s edition, or ask us to bring one to yours.</p>
              <div className="hero-actions">
                <button type="button" className="button-primary" onClick={() => setRequestOpen(true)}>Request your city <ArrowRight size={17} /></button>
                <a className="button-quiet" href="#city-directory">Find your city <ArrowDown size={15} /></a>
              </div>
              <p className="hero-footnote">No account needed. Requests are reviewed by our team.</p>
            </div>
            <div className="vista-collage" aria-label="Views from Boston, Houston, Miami and Sacramento">
              <figure className="vista vista-large"><img src="/api/storage/public-objects/cities/boston/hero.jpg" alt="Boston city view" /><figcaption><span>01 / NEW EDITION</span><b>Boston</b></figcaption></figure>
              <figure className="vista vista-sf"><img src="/__mockup/images/houston-dusk.jpg" alt="Houston skyline at dusk" /><figcaption><span>02</span><b>Houston</b></figcaption></figure>
              <figure className="vista vista-austin"><img src="/api/storage/public-objects/cities/miami/hero.jpg" alt="Miami waterfront skyline" /><figcaption><span>03</span><b>Miami</b></figcaption></figure>
              <figure className="vista vista-sac"><img src="/__mockup/images/sacramento-hero.jpg" alt="Sacramento city view" /></figure>
              <span className="collage-stamp">GOOD THINGS<br />HAPPEN HERE</span>
            </div>
          </div>
          <div className="hero-baseline"><span>Made for your corner of the world</span><span className="baseline-dot" /><span>Local events, useful reads, neighborly finds</span></div>
        </section>

        <section id="city-directory" className="directory-section">
          <div className="section-heading">
            <div><span className="eyebrow">The city editions</span><h2>Find your <em>nearby.</em></h2><p>Choose a city for its local newsletter, event guide and city-specific reading.</p><p className="custom-newsletter-note">We can build custom Event Newsletters around your city’s voice and interests—like <a href="https://austin.eventcarpooling.com" target="_blank" rel="noreferrer">Raj’s Austin Events</a>.</p></div>
            <div className="directory-key"><NewBadge /><span>Recently added</span></div>
          </div>
          <div className="city-grid">
            {sorted.map(item => {
              const reading = ETHICS[item.slug];
              return <article key={item.slug} className={`city-card group ${item.slug === "boston" ? "city-card-featured" : ""}`}>
                <a className="city-card-main" href={`https://${item.slug}.eventcarpooling.com`} target="_blank" rel="noreferrer" aria-label={`Visit ${item.name}`}>
                  {item.image ? <img className="city-card-photo" src={item.image} alt={item.alt ?? ""} loading="lazy" /> : <div className="city-card-placeholder"><MapPin size={21} /></div>}
                  <span className="city-card-shade" />
                  <span className="city-card-heading"><span className="city-card-city">{item.city}</span><span className="city-card-name">{item.name}</span></span>
                  {NEW_CITY_SLUGS.includes(item.slug) && <span className="city-card-new"><NewBadge /></span>}
                  <ExternalLink className="city-card-external" size={17} />
                </a>
                <a className="city-card-reading" href={reading?.href ?? `https://${item.slug}.eventcarpooling.com`} target="_blank" rel="noreferrer">
                  <span className="reading-label"><Newspaper size={14} /> Local AI Ethics</span>
                  <span className="reading-title">{reading?.label ?? `Explore the ${item.city} edition`}</span>
                  <ExternalLink size={13} />
                </a>
              </article>;
            })}
          </div>
          <div className="request-note"><span className="request-note-mark"><MapPin size={18} /></span><p><strong>Not seeing your city?</strong> Tell us where you are and we’ll review a city request.</p><button type="button" className="text-link-button" onClick={() => setRequestOpen(true)}>Request your city <ArrowRight size={15} /></button></div>
        </section>

        <section className="spotlight-row" aria-label="Featured local programs">
          <article className="cares-spotlight">
            <div className="spotlight-topline"><span className="spotlight-marker" /> AUSTIN · WEEKLY DEALS</div>
            <h2>Good things nearby.<br /><em>Good prices, too.</em></h2>
            <p>AustinCares gathers local deals to help make life in Austin a little more affordable.</p>
            <a href="https://austincares.eventcarpooling.com" target="_blank" rel="noreferrer" className="spotlight-link">Explore AustinCares <ArrowRight size={16} /></a>
            <span className="spotlight-ornament" aria-hidden="true">AC</span>
          </article>
          <article className="ethics-spotlight">
            <div className="spotlight-topline"><span className="ethics-mark" /> LOCAL AI ETHICS</div>
            <h2>Technology belongs<br />in a <em>local conversation.</em></h2>
            <p>Each city edition brings AI questions back to the people, places and public choices around us.</p>
            <a href="#city-directory" className="spotlight-link">Explore city-by-city resources <ArrowRight size={16} /></a>
            <img className="integrity-logo" src="/__mockup/images/intelligence-integrity.png" alt="Intelligence with integrity" />
          </article>
        </section>

        <section className="closing-cta" id="launch">
          <div className="closing-inner"><span className="eyebrow">A good place to begin</span><h2>Your city has<br /><em>a story to tell.</em></h2><p>Request a city edition. Our team will review your note and follow up about next steps.</p><button type="button" className="button-primary" onClick={() => setRequestOpen(true)}>Request your city <ArrowRight size={17} /></button><small>No password or account needed. A request does not automatically launch a city.</small></div>
        </section>
      </main>

      {requestOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-[#182b24]/55 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeRequest(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="mock-request-title" className="w-full max-w-md rounded-xl border border-[#dfe4d9] bg-[#fbfaf5] p-6 shadow-xl">
          {submitted ? <div role="status"><span className="eyebrow">Request noted</span><h2 id="mock-request-title" className="mt-3 font-serif text-3xl text-[#29473b]">Thank you, {city}.</h2><p className="mt-3 text-sm leading-6 text-[#718078]">This sandbox preview does not submit requests. The live page sends city requests to the EventCarpooling team.</p><button type="button" className="button-primary mt-4" onClick={closeRequest}>Close</button></div> : <form onSubmit={submitRequest}>
            <span className="eyebrow">Your neighborhood, next</span><h2 id="mock-request-title" className="mt-3 font-serif text-3xl text-[#29473b]">Request your city</h2><p className="mb-5 mt-2 text-sm leading-6 text-[#718078]">Tell us your city and email. Our team will review your request.</p>
            <label className="mb-1 block text-sm font-semibold text-[#395548]" htmlFor="mock-city">City name</label><input id="mock-city" required minLength={2} value={city} onChange={event => setCity(event.target.value)} className="mb-4 block w-full rounded-md border border-[#d8dfd6] bg-white px-3 py-2.5 text-sm" placeholder="San Antonio" />
            <label className="mb-1 block text-sm font-semibold text-[#395548]" htmlFor="mock-email">Email address</label><input id="mock-email" required type="email" value={email} onChange={event => setEmail(event.target.value)} className="mb-4 block w-full rounded-md border border-[#d8dfd6] bg-white px-3 py-2.5 text-sm" placeholder="you@example.com" />
            <p className="mb-4 text-xs leading-5 text-[#7b8980]">Preview-only form. On the live platform, submissions are saved for manual review.</p>
            <button type="submit" className="button-primary w-full">Preview confirmation <ArrowRight size={16} /></button>
          </form>}
          {!submitted && <button type="button" className="mt-4 w-full text-xs font-semibold text-[#718078] underline" onClick={closeRequest}>Cancel</button>}
        </section>
      </div>}
    </div>
  );
}
