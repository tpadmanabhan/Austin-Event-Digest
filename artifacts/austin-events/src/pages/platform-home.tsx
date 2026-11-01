import "./platform-home.css";
import { LA_HERO_IMAGE_URL } from "@/lib/city-share-image";
import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowRight, ExternalLink, MapPin, Newspaper } from "lucide-react";
import { PlatformLayout } from "@/components/platform-layout";
import { useLang } from "@/contexts/lang-context";
import { LaunchCityModal } from "@/components/launch-city-modal";
import { CityEventsFeed } from "@/components/city-events-feed";
import { JAPANESE_CITY_COPY, PLATFORM_HOME_COPY } from "@/i18n/platform-home";

interface TenantSummary {
  slug: string;
  name: string;
  city: string;
  accentColor: string;
  categories: string[];
}

const FEATURED_CITY_SLUG = "austin";
const LIVE_CITY_ORDER = ["austin", "nyc", "dallas", "manchester", "osaka", "la", "boston", "atlanta", "sanfrancisco", "sacramento", "miami", "houston", "tokyo", "stlouis", "portland", "bulverde", "dc"];
const NEW_CITY_SLUGS = new Set([FEATURED_CITY_SLUG]);
const cityUrl = (slug: string) => `https://${slug}.irl.group`;
const publicImage = (name: string) => `${import.meta.env.BASE_URL}images/${name}`;

const CITY_DIRECTORY = [
  { slug: "austin", name: "Raj's Austin Events", city: "Austin", image: publicImage("austin-hero.png"), alt: "Austin skyline at sunset" },
  { slug: "nyc", name: "New York City Events", city: "New York City", image: publicImage("nyc-hero-photo.jpg"), alt: "New York skyline at blue hour viewed across the East River" },
  { slug: "dallas", name: "Dallas Events", city: "Dallas", image: publicImage("dallas-hero.jpg"), alt: "Dallas skyline at dusk" },
  { slug: "manchester", name: "Manchester Events", city: "Manchester, England", image: publicImage("manchester-hero.svg"), alt: "Illustrated Manchester skyline at dusk with a golden worker bee" },
  { slug: "osaka", name: "Osaka Events", city: "Osaka", image: publicImage("osaka-hero.jpg"), alt: "Dotonbori canal and evening lights in Osaka" },
  { slug: "la", name: "Los Angeles Events", city: "Los Angeles", image: LA_HERO_IMAGE_URL, alt: "Pacific Ocean at Point Dume near Los Angeles" },
  { slug: "boston", name: "Boston Events", city: "Boston", image: "/api/storage/public-objects/cities/boston/hero.jpg", alt: "Boston city view" },
  { slug: "atlanta", name: "Atlanta Events", city: "Atlanta", image: publicImage("atlanta-hero.svg"), alt: "Atlanta city illustration" },
  { slug: "sanfrancisco", name: "San Francisco Events", city: "San Francisco", image: publicImage("sanfrancisco-hero.jpg"), alt: "San Francisco across the bay" },
  { slug: "sacramento", name: "Sacramento Events", city: "Sacramento", image: publicImage("sacramento-hero.jpg"), alt: "Sacramento city vista" },
  { slug: "miami", name: "Miami Events", city: "Miami", image: "/api/storage/public-objects/cities/miami/hero.jpg", alt: "Miami waterfront skyline and beach" },
  { slug: "houston", name: "Houston Events", city: "Houston", image: publicImage("houston-dusk.jpg"), alt: "Houston skyline at dusk" },
  { slug: "tokyo", name: "Tokyo Events", city: "Tokyo", image: publicImage("tokyo-city.jpg"), alt: "Tokyo skyline glowing at twilight" },
  { slug: "stlouis", name: "St. Louis Events", city: "St. Louis", image: publicImage("stlouis-hero.jpg"), alt: "St. Louis city vista" },
  { slug: "portland", name: "Portland Events", city: "Portland", image: publicImage("portland-city.jpg"), alt: "Portland skyline reflected across the Willamette River" },
  { slug: "bulverde", name: "Bulverde Events", city: "Bulverde", image: publicImage("bulverde-hero.jpg"), alt: "Bulverde Hill Country landscape" },
  { slug: "dc", name: "DC Events", city: "Washington, DC", image: publicImage("dc-hero.jpg"), alt: "Washington, DC city vista" },
];

const ETHICS_RESOURCES: Record<string, { href: string; label: string; jaLabel: string }> = {
  la: { href: "https://ita.lacity.gov/news/ita-publishes-ai-safety-checklist", label: "L.A. A.I. Safety Checklist", jaLabel: "ロサンゼルス市のAI安全チェックリスト" },
  boston: { href: "https://www.boston.gov/government/cabinets/innovation-and-technology/city-boston-generative-artificial-intelligence-gen-ai", label: "Boston’s generative AI policy", jaLabel: "ボストン市の生成AI方針" },
  sanfrancisco: { href: "https://hai.stanford.edu/ai-index/2026-ai-index-report", label: "Stanford HAI AI Index 2026", jaLabel: "スタンフォードHAI AIインデックス 2026" },
  osaka: { href: "https://www.city.osaka.lg.jp/ictsenryakushitsu/page/0000675810.html", label: "Osaka City AI Utilization Basic Policy", jaLabel: "大阪市AI活用基本方針" },
  manchester: { href: "https://www.mmu.ac.uk/research/projects/gm-people-panel-ai", label: "Greater Manchester People’s Panel for AI", jaLabel: "Greater Manchester People’s Panel for AI" },
  nyc: { href: "https://www.nyc.gov/content/oti/pages/artificial-intelligence", label: "New York City AI policy and guidance", jaLabel: "ニューヨーク市のAI方針とガイダンス" },
  dallas: { href: "https://dallascityhall.com/government/citymanager/Documents/Council%20Materials/C.%20Update%20on%20AI%20City%20AI%20Plan.pdf", label: "Dallas AI Plan and governance briefing", jaLabel: "ダラス市のAI計画とガバナンスに関する説明資料" },
  austin: { href: "https://customersuccessforgood.com/2026/10/07/ai-doesnt-solve-this/", label: "AI Doesn’t Solve This", jaLabel: "AI Doesn’t Solve This" },
  sacramento: { href: "https://www.nist.gov/itl/ai-risk-management-framework", label: "NIST AI Risk Management Framework", jaLabel: "NIST AIリスクマネジメント・フレームワーク" },
  miami: { href: "https://algorithmsofoppression.com/about/", label: "Algorithms of Oppression", jaLabel: "Algorithms of Oppression" },
};

function useTenantList() {
  return useQuery<TenantSummary[]>({
    queryKey: ["tenants-list"],
    queryFn: async () => {
      const response = await fetch("/api/tenants/list");
      if (!response.ok) throw new Error("Could not load the city directory");
      const data = await response.json();
      return data.tenants as TenantSummary[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

function CityCard({ city }: { city: (typeof CITY_DIRECTORY)[number] }) {
  const reading = ETHICS_RESOURCES[city.slug];
  const { lang } = useLang();
  const copy = PLATFORM_HOME_COPY[lang];
  const japaneseCity = lang === "ja" ? JAPANESE_CITY_COPY[city.slug] : undefined;
  const cityName = japaneseCity?.city ?? city.city;
  const displayName = japaneseCity?.name ?? city.name;
  const readingTitle = reading
    ? lang === "ja" ? reading.jaLabel : reading.label
    : copy.cityExplore.replace("{city}", cityName);
  return (
      <article className={`city-card group ${city.slug === FEATURED_CITY_SLUG ? "city-card-featured" : ""} ${city.slug === "dallas" ? "city-card-dallas" : ""}`}>
      <a className="city-card-main" href={cityUrl(city.slug)} target="_blank" rel="noopener noreferrer" aria-label={lang === "ja" ? `${displayName}を見る` : `Visit ${city.name}`}>
        {city.image ? (
          <img className="city-card-photo" src={city.image} alt={japaneseCity?.alt ?? city.alt ?? ""} loading="lazy" />
        ) : (
          <div className="city-card-placeholder" aria-hidden="true"><MapPin size={21} strokeWidth={1.6} /></div>
        )}
        <span className="city-card-shade" aria-hidden="true" />
        {NEW_CITY_SLUGS.has(city.slug) && <span className="city-card-badge" aria-hidden="true">{copy.newBadge}</span>}
        <span className="city-card-heading">
          <span className="city-card-city">{cityName}</span>
          <span className="city-card-name">{displayName}</span>
        </span>
        <ExternalLink className="city-card-external" size={17} aria-hidden="true" />
      </a>
      <a className="city-card-reading" href={reading?.href ?? cityUrl(city.slug)} target="_blank" rel="noopener noreferrer">
        <span className="reading-label"><Newspaper size={14} aria-hidden="true" />{copy.localEthics}</span>
        <span className="reading-title">{readingTitle}</span>
        <ExternalLink size={13} aria-hidden="true" />
      </a>
    </article>
  );
}

function PlatformHomeInner() {
  const { data: tenants, isLoading, isError, refetch } = useTenantList();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { lang } = useLang();
  const copy = PLATFORM_HOME_COPY[lang];
  const cities = [...CITY_DIRECTORY]
    .filter(city => !["la", "sanfrancisco", "miami", "boston"].includes(city.slug) || tenants?.some(tenant => tenant.slug === city.slug) || !tenants)
    .sort((a, b) => LIVE_CITY_ORDER.indexOf(a.slug) - LIVE_CITY_ORDER.indexOf(b.slug));

  return (
    <>
      <section className={`platform-hero ${lang === "ja" ? "platform-hero-ja" : ""}`}>
        <div className="platform-hero-inner">
          <motion.div className="hero-copy" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <div className="hero-kicker"><span className="kicker-rule" /> {copy.heroKicker}</div>
            <h1>{copy.heroTitle}<br /><em>{copy.heroHighlight}</em></h1>
            <p className="hero-tagline">{copy.heroTagline}</p>
            <p className="hero-description">
              {copy.heroDescription}
            </p>
            <div className="hero-actions">
              <button type="button" className="button-primary" onClick={() => setIsModalOpen(true)} data-testid="button-request-city-hero">
                {copy.requestButton} <ArrowRight size={17} aria-hidden="true" />
              </button>
              <a className="button-quiet" href="#city-directory"><span>{lang === "ja" ? "都市を探す" : "Find your city"}</span><ArrowDown size={15} aria-hidden="true" /></a>
            </div>
            <p className="hero-footnote">{copy.heroFootnote}</p>
          </motion.div>

          <div className="platform-hero-right">
            <motion.div className="vista-collage" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.08 }} aria-label={copy.collageLabel}>
              <figure className="vista vista-large">
                <img src="/api/storage/public-objects/cities/boston/hero.jpg" alt={lang === "ja" ? "ボストンの街並み" : "Boston city view"} fetchPriority="high" />
                <figcaption><span>{copy.editionLabel}</span><b>{lang === "ja" ? "ボストン" : "Boston"}</b></figcaption>
              </figure>
              <figure className="vista vista-sf">
                <img src={publicImage("houston-dusk.jpg")} alt={lang === "ja" ? "夕暮れのヒューストンのスカイライン" : "Houston skyline at dusk"} />
                <figcaption><span>02</span><b>{lang === "ja" ? "ヒューストン" : "Houston"}</b></figcaption>
              </figure>
              <figure className="vista vista-austin">
                <img src="/api/storage/public-objects/cities/miami/hero.jpg" alt={lang === "ja" ? "マイアミの水辺とスカイライン" : "Miami waterfront skyline"} />
                <figcaption><span>03</span><b>{lang === "ja" ? "マイアミ" : "Miami"}</b></figcaption>
              </figure>
              <figure className="vista vista-sac">
                <img src={publicImage("sacramento-hero.jpg")} alt={lang === "ja" ? "サクラメントの街並み" : "Sacramento city view"} />
              </figure>
              <span className="collage-stamp">{lang === "ja" ? <>素敵な出会いが<br />ここにある</> : <>GOOD THINGS<br />HAPPEN HERE</>}</span>
            </motion.div>
            <CityEventsFeed />
          </div>
        </div>
        <div className="hero-baseline"><span>{copy.baselineLead}</span><span className="baseline-dot" /><span>{copy.baselineTail}</span></div>
      </section>

      <section id="city-directory" className="directory-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{copy.directoryEyebrow}</span>
            <h2>{copy.directoryTitle}{lang === "ja" ? "" : " "}<em>{copy.directoryHighlight}</em></h2>
            <p>{copy.directoryDescription}</p>
            <p className="custom-newsletter-note">
              {copy.customNewsletterIntro}
              <a href="https://austin.irl.group" target="_blank" rel="noopener noreferrer">{copy.customNewsletterLink}</a>
              {copy.customNewsletterEnding}
            </p>
          </div>
        </div>
        {isError && (
          <div className="directory-alert" role="status">
            <span>{copy.directoryError}</span>
            <button type="button" onClick={() => void refetch()} data-testid="button-retry-cities">{copy.tryAgain}</button>
          </div>
        )}
        <div className="city-grid" aria-busy={isLoading}>
          {isLoading ? (
            <div className="directory-skeletons" role="status" aria-label={lang === "ja" ? "都市版を読み込み中" : "Loading city editions"}>
              {CITY_DIRECTORY.slice(0, 6).map(city => <div className="city-skeleton" key={city.slug}><span /><i /></div>)}
            </div>
          ) : cities.map(city => <CityCard key={city.slug} city={city} />)}
        </div>
        <div className="request-note">
          <span className="request-note-mark"><MapPin size={18} aria-hidden="true" /></span>
          <p><strong>{copy.requestNoteTitle}</strong> {copy.requestNote}</p>
          <button type="button" className="text-link-button" onClick={() => setIsModalOpen(true)} data-testid="button-request-city-directory">
            {copy.requestButton} <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="spotlight-row" aria-label={lang === "ja" ? "地域の注目プログラム" : "Featured local programs"}>
        <article className="cares-spotlight">
          <div className="spotlight-topline"><span className="spotlight-marker" />{copy.caresEyebrow}</div>
          <h2>{copy.caresTitle}<br /><em>{copy.caresHighlight}</em></h2>
          <p>{copy.caresDescription}</p>
          <a href="https://austincares.irl.group" target="_blank" rel="noopener noreferrer" className="spotlight-link">
            {copy.caresLink} <ArrowRight size={16} aria-hidden="true" />
          </a>
          <span className="spotlight-ornament" aria-hidden="true">AC</span>
        </article>
        <article className="ethics-spotlight">
          <div className="spotlight-topline"><span className="ethics-mark" />{copy.ethicsEyebrow}</div>
          <h2>{copy.ethicsTitle}<br />{lang === "ja" ? <em>{copy.ethicsHighlight}</em> : <>in a <em>{copy.ethicsHighlight}</em></>}</h2>
          <p>{copy.ethicsDescription}</p>
          <a href="#city-directory" className="spotlight-link">
            {copy.ethicsLink} <ArrowRight size={16} aria-hidden="true" />
          </a>
          <img className="integrity-logo" src={publicImage("intelligence-integrity.png")} alt={lang === "ja" ? "知性と誠実さ" : "Intelligence with integrity"} />
        </article>
      </section>

      <section className="closing-cta" id="launch">
        <div className="closing-inner">
          <span className="eyebrow">{copy.closingEyebrow}</span>
          <h2>{copy.closingTitle}<br /><em>{copy.closingHighlight}</em></h2>
          <p>{copy.closingDescription}</p>
          <button type="button" className="button-primary" onClick={() => setIsModalOpen(true)} data-testid="button-request-city-footer">
            {copy.requestButton} <ArrowRight size={17} aria-hidden="true" />
          </button>
          <small>{copy.noAutomaticLaunch}</small>
        </div>
      </section>
      <LaunchCityModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
}

export default function PlatformHome() {
  return <PlatformLayout><PlatformHomeInner /></PlatformLayout>;
}
