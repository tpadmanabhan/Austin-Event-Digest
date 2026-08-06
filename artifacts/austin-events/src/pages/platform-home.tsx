import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Check, ExternalLink, ArrowRight, Users, Globe, Star } from "lucide-react";
import { PlatformLayout } from "@/components/platform-layout";
import { useLang } from "@/contexts/lang-context";
import { LaunchCityModal } from "@/components/launch-city-modal";
import { EventMap } from "@/components/event-map";

const PLATFORM_MAP_EVENTS = [
  { title: "Tech Meetup @ The Domain",      lat: 30.401, lng: -97.723, category: "Tech",    featured: false },
  { title: "Live Music on 6th Street",       lat: 30.268, lng: -97.740, category: "Arts",    featured: true  },
  { title: "SoCo Arts Festival",             lat: 30.244, lng: -97.750, category: "Arts",    featured: false },
  { title: "Mueller Farmers Market",         lat: 30.300, lng: -97.702, category: "Arts",    featured: false },
  { title: "Yoga in Zilker Park",            lat: 30.266, lng: -97.768, category: "Wellness",featured: false },
  { title: "Round Rock Startup Summit",      lat: 30.508, lng: -97.679, category: "Tech",    featured: false },
  { title: "Domain Food Festival",           lat: 30.403, lng: -97.730, category: "Arts",    featured: false },
  { title: "Cedar Park Family Fun Day",      lat: 30.504, lng: -97.821, category: "Sports",  featured: false },
  { title: "Pflugerville Civic Night",       lat: 30.437, lng: -97.619, category: "Civics",  featured: false },
];

interface TenantSummary {
  slug: string;
  name: string;
  city: string;
  accentColor: string;
  categories: string[];
}

function useTenantList() {
  return useQuery<TenantSummary[]>({
    queryKey: ["tenants-list"],
    queryFn: async () => {
      const res = await fetch("/api/tenants/list");
      if (!res.ok) throw new Error("Failed to fetch tenants");
      const data = await res.json();
      return data.tenants as TenantSummary[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

const CATEGORY_KEYS = [
  { name: "Tech",     emoji: "💻", sources: ["Luma", "Meetup", "Eventbrite"], border: "#3b82f6", bg: "#eff6ff", badge: "#dbeafe", badgeText: "#1d4ed8" },
  { name: "Arts",     emoji: "🎨", sources: ["Luma", "Bandsintown", "Eventbrite"], border: "#9c7c4a", bg: "#fdf6ee", badge: "#ecdfc8", badgeText: "#6b4c26" },
  { name: "Sports",   emoji: "🏃", sources: ["Meetup", "Luma", "Eventbrite"], border: "#14b8a6", bg: "#f0fdfa", badge: "#ccfbf1", badgeText: "#0f766e" },
  { name: "Wellness", emoji: "🧘", sources: ["Luma", "Meetup", "Eventbrite"], border: "#22c55e", bg: "#f0fdf4", badge: "#dcfce7", badgeText: "#15803d" },
  { name: "Civics",   emoji: "🏛️", sources: ["Meetup", "Eventbrite"], border: "#f59e0b", bg: "#fffbeb", badge: "#fef3c7", badgeText: "#b45309" },
] as const;

function PlatformHomeInner() {
  const { t } = useLang();
  const { data: tenants, isLoading: loadingTenants } = useTenantList();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const STEPS = [
    { number: "01", icon: "📍", title: t.step1Title, description: t.step1Desc },
    { number: "02", icon: "📋", title: t.step2Title, description: t.step2Desc },
    { number: "03", icon: "🚀", title: t.step3Title, description: t.step3Desc },
    { number: "04", icon: "🚗", title: t.step4Title, description: t.step4Desc, comingSoon: true },
  ];

  const FEATURES = [t.feat1, t.feat2, t.feat3, t.feat4];

  const CAT_DESCS: Record<string, string> = {
    Tech: t.catTechDesc,
    Arts: t.catArtsDesc,
    Sports: t.catSportsDesc,
    Wellness: t.catWellnessDesc,
    Civics: t.catCivicsDesc,
  };

  return (
    <>
      {/* HERO */}
      <section
        className="relative overflow-hidden text-center"
        style={{
          background: "linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #14532d 100%)",
          padding: "80px 32px 96px",
        }}
      >
        {/* dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(34,197,94,0.08) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* green glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 600,
            height: 300,
            background: "radial-gradient(ellipse, rgba(34,197,94,0.15), transparent 70%)",
          }}
        />
        {/* skyline silhouettes */}
        <svg
          viewBox="0 0 1280 260"
          preserveAspectRatio="xMidYMax meet"
          aria-hidden="true"
          fill="white"
          className="absolute bottom-0 left-0 w-full pointer-events-none"
          style={{ height: 260, opacity: 0.07 }}
        >
          <path d="M0,260 L0,190 L18,190 L18,175 L36,175 L36,190 L50,190 L50,165 L62,165 L62,190 L76,190 L76,180 L90,180 L90,170 L104,170 L104,185 L118,185 L118,160 L130,160 L130,185 L142,185 L142,170 L155,170 L155,260 Z" />
          <path d="M163,260 L163,145 L167,145 L167,130 L170,130 L170,118 L172,118 L172,107 L173,107 L173,96 L174,96 L174,85 L175,85 L175,72 L176,65 L177,72 L177,85 L178,85 L178,96 L179,96 L179,107 L180,107 L180,118 L182,118 L182,130 L185,130 L185,145 L189,145 L189,260 Z" />
          <path d="M192,260 L192,175 L210,175 L210,155 L228,155 L228,175 L244,175 L244,260 Z" />
          <path d="M248,260 L248,140 L256,140 L256,120 L260,120 L260,105 L262,105 L262,90 L264,90 L264,78 L265,78 L265,65 L266,65 L266,52 L267,52 L267,38 L268,30 L268,18 L269,12 L270,18 L270,30 L271,30 L271,38 L272,38 L272,52 L273,52 L273,65 L274,65 L274,78 L275,78 L275,90 L277,90 L277,105 L279,105 L279,120 L283,120 L283,140 L291,140 L291,260 Z" />
          <path d="M294,260 L294,170 L310,170 L310,155 L322,155 L322,165 L338,165 L338,150 L352,150 L352,165 L368,165 L368,175 L384,175 L384,260 Z" />
          <path d="M415,260 L415,220 L419,220 L419,150 L421,150 L421,135 L424,135 L424,125 L426,125 L430,122 L434,125 L436,125 L436,135 L439,135 L439,150 L441,150 L441,220 L445,220 L445,260 Z M423,125 L423,110 L424,100 L427,88 L430,85 L433,88 L436,100 L437,110 L437,125 Z" />
          <path d="M448,260 L448,175 L464,175 L464,160 L480,160 L480,175 L496,175 L496,185 L512,185 L512,165 L528,165 L528,185 L544,185 L544,260 Z" />
          <path d="M574,260 L574,180 L578,180 L578,150 L580,150 L580,120 L581,120 L581,95 L582,95 L582,72 L583,72 L583,52 L584,52 L584,35 L585,35 L585,20 L586,20 L586,10 L587,5 L588,10 L588,20 L589,20 L589,35 L590,35 L590,52 L591,52 L591,72 L592,72 L592,95 L593,95 L593,120 L594,120 L594,150 L596,150 L596,180 L600,180 L600,260 Z" />
          <path d="M603,260 L603,175 L618,175 L618,160 L632,160 L632,175 L648,175 L648,165 L664,165 L664,175 L680,175 L680,185 L696,185 L696,170 L712,170 L712,185 L728,185 L728,260 Z" />
          <path d="M752,260 L752,240 L758,240 L758,220 L763,220 L770,180 L772,180 L773,160 L775,145 L776,130 L777,118 L778,108 L779,100 L780,93 L781,87 L782,82 L783,78 L784,75 L785,72 L786,70 L787,68 L788,67 L789,68 L790,70 L791,72 L792,75 L793,78 L794,82 L795,87 L796,93 L797,100 L798,108 L799,118 L800,130 L801,145 L803,160 L804,180 L806,180 L813,220 L818,220 L818,240 L824,240 L824,260 Z M786,67 L787,50 L788,67 Z" />
          <path d="M874,260 L874,130 L876,130 L876,120 L878,120 L878,112 L880,112 L880,105 L882,105 L882,98 L880,95 L882,92 L884,90 L886,92 L888,95 L886,98 L886,105 L888,105 L888,112 L890,112 L890,120 L892,120 L892,130 L894,130 L894,260 Z" />
          <path d="M924,260 L924,145 L928,145 L928,120 L930,120 L930,100 L931,100 L931,80 L932,80 L932,60 L933,55 L934,50 L935,45 L936,50 L937,55 L938,60 L938,80 L939,80 L939,100 L940,100 L940,120 L942,120 L942,145 L946,145 L946,260 Z" />
          <path d="M949,260 L949,175 L966,175 L966,155 L982,155 L982,170 L998,170 L998,155 L1012,155 L1012,170 L1028,170 L1028,180 L1044,180 L1044,165 L1058,165 L1058,180 L1074,180 L1074,190 L1090,190 L1090,175 L1106,175 L1106,190 L1122,190 L1122,175 L1138,175 L1138,190 L1154,190 L1154,200 L1170,200 L1170,185 L1186,185 L1186,200 L1202,200 L1202,185 L1218,185 L1218,195 L1234,195 L1234,210 L1252,210 L1252,200 L1268,200 L1268,210 L1280,210 L1280,260 Z" />
        </svg>

        <div className="relative max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8"
              style={{
                background: "rgba(34,197,94,0.15)",
                border: "1px solid rgba(34,197,94,0.3)",
              }}
            >
              <img
                src={`${import.meta.env.BASE_URL}eventcarpooling-logo.svg`}
                alt=""
                className="h-5 w-auto object-contain"
              />
              <span className="text-sm font-semibold" style={{ color: "#4ade80" }}>
                {t.heroBadge}
              </span>
            </div>

            <h1 className="font-serif font-bold text-white mb-6 leading-[1.15]" style={{ fontSize: "clamp(32px, 4.5vw, 60px)" }}>
              {t.heroH1a}{" "}
              <span className="italic" style={{ color: "#4ade80" }}>{t.heroH1b}</span>
            </h1>

            <p className="text-lg mb-4 leading-relaxed max-w-2xl mx-auto" style={{ color: "#94a3b8" }}>
              {t.heroSub}
            </p>

            <p className="text-2xl font-bold mb-4 max-w-2xl mx-auto" style={{ color: "#f1f5f9" }}>
              {t.heroSlogan}
            </p>

            <p className="text-base mb-4 leading-relaxed max-w-2xl mx-auto" style={{ color: "#94a3b8" }}>
              {t.heroMission}
            </p>

            <p className="text-2xl font-bold mb-4 max-w-2xl mx-auto" style={{ color: "#f1f5f9" }}>
              {t.heroLuddite}
            </p>

            <p className="text-base mb-10 leading-relaxed max-w-2xl mx-auto" style={{ color: "#94a3b8" }}>
              {t.heroLudditeDesc}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center flex-wrap mb-8">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-base font-semibold text-white transition-all hover:-translate-y-0.5"
                style={{
                  background: "linear-gradient(135deg, #16a34a, #22c55e)",
                  boxShadow: "0 8px 24px rgba(22,163,74,0.4)",
                }}
              >
                {t.heroCta} <ArrowRight className="w-5 h-5" />
              </button>
              {[
                {
                  href: "https://austin.eventcarpooling.com",
                  icon: "🎸",
                  iconBg: "linear-gradient(135deg, #1e1b4b, #312e81)",
                  iconShadow: "0 3px 10px rgba(49,46,129,0.5)",
                  label: "Raj's Austin Events",
                },
                {
                  href: "https://sacramento.eventcarpooling.com",
                  icon: "👑",
                  iconBg: "linear-gradient(135deg, #1a0a30, #5A2D81)",
                  iconShadow: "0 3px 10px rgba(90,45,129,0.5)",
                  label: "Sacramento Events",
                },
                {
                  href: "https://portland.eventcarpooling.com",
                  icon: "🌹",
                  iconBg: "linear-gradient(135deg, #1a3a1a, #2d6a2d)",
                  iconShadow: "0 3px 10px rgba(45,106,45,0.5)",
                  label: "Portland Events",
                },
                {
                  href: "https://bulverde.eventcarpooling.com",
                  icon: "🌳",
                  iconBg: "linear-gradient(135deg, #162010, #2a4015)",
                  iconShadow: "0 3px 10px rgba(22,32,16,0.5)",
                  label: "Bulverde Events",
                },
                {
                  href: "https://stlouis.eventcarpooling.com",
                  icon: (
                    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 28, height: 28 }}>
                      <path d="M10 43 L14 43 C14 30 24 10 24 10 C24 10 34 30 34 43 L38 43 C38 27 26 5 24 5 C22 5 10 27 10 43 Z" fill="rgba(255,255,255,0.95)" />
                    </svg>
                  ),
                  iconBg: "linear-gradient(135deg, #0c1a3a, #1a3a6e)",
                  iconShadow: "0 3px 10px rgba(12,26,58,0.55)",
                  label: "St. Louis Events",
                },
                {
                  href: "https://tokyo.eventcarpooling.com",
                  icon: "🗼",
                  iconBg: "linear-gradient(135deg, #4d0000, #CC0000)",
                  iconShadow: "0 3px 10px rgba(204,0,0,0.5)",
                  label: "Tokyo Events",
                },
              ].map(city => (
                <a
                  key={city.href}
                  href={city.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-3 rounded-full border px-5 py-2.5 text-sm font-semibold transition-all hover:-translate-y-0.5"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    borderColor: "rgba(255,255,255,0.15)",
                    color: "#e2e8f0",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.11)";
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(99,179,237,0.4)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.06)";
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.15)";
                  }}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xl leading-none"
                    style={{ background: city.iconBg, boxShadow: city.iconShadow }}
                  >
                    {city.icon}
                  </span>
                  <span className="flex flex-col items-start leading-tight">
                    <span className="text-xs font-medium" style={{ color: "#94a3b8" }}>{t.heroLiveNow}</span>
                    <span>{city.label}</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: "#94a3b8" }} />
                </a>
              ))}
            </div>

            {/* Persona chips */}
            <div className="flex flex-wrap justify-center gap-3 mt-8 mb-2">
              {[
                { label: "NEW IN TOWN", emoji: "📦", bg: "rgba(217,119,6,0.18)", border: "rgba(217,119,6,0.45)", color: "#fbbf24" },
                { label: "NO LONGER DRIVES", emoji: "🚌", bg: "rgba(59,130,246,0.18)", border: "rgba(59,130,246,0.45)", color: "#60a5fa" },
                { label: "SOCCER SEASON", emoji: "⚽", bg: "rgba(34,197,94,0.18)", border: "rgba(34,197,94,0.45)", color: "#4ade80" },
                { label: "SKIPPING SURGE", emoji: "💸", bg: "rgba(168,85,247,0.18)", border: "rgba(168,85,247,0.45)", color: "#c084fc" },
              ].map(({ label, emoji, bg, border, color }) => (
                <div
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2"
                  style={{ background: bg, border: `1px solid ${border}` }}
                >
                  <span className="text-base leading-none">{emoji}</span>
                  <span className="text-xs font-bold tracking-widest uppercase" style={{ color }}>{label}</span>
                </div>
              ))}
            </div>

            {/* Stats row */}
            <div
              className="flex justify-center"
              style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 40 }}
            >
              {[
                { icon: <Globe className="w-5 h-5" style={{ color: "#4ade80" }} />, value: "3", label: t.statCities },
                { icon: <Star className="w-5 h-5" style={{ color: "#4ade80" }} />, value: "5", label: t.statCategories },
                { icon: <Users className="w-5 h-5" style={{ color: "#4ade80" }} />, value: "10+", label: t.statSources },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="flex-1 text-center px-8"
                  style={{ borderRight: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none" }}
                >
                  <div className="flex justify-center mb-2">{stat.icon}</div>
                  <div className="text-3xl font-bold text-white leading-none">{stat.value}</div>
                  <div className="text-xs mt-1 font-medium" style={{ color: "#64748b" }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CITY MAP SHOWCASE */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <div
              className="inline-block rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-widest mb-4"
              style={{ background: "#dcfce7", color: "#15803d" }}
            >
              🗺️ Live Near You
            </div>
            <h2 className="font-serif text-4xl font-bold mb-3" style={{ color: "#0f172a" }}>
              Events happening across your city
            </h2>
            <p style={{ color: "#64748b" }}>
              Every week, hand-picked events pinned on a live map — sorted by distance from wherever you are.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-3xl overflow-hidden shadow-xl border border-border"
          >
            <EventMap
              events={PLATFORM_MAP_EVENTS}
              center={[30.360, -97.720]}
              radiusMiles={40}
              height={420}
            />
          </motion.div>

          <p className="text-center text-xs text-muted-foreground mt-3">
            Sample pins shown for illustration — Austin, TX area
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20" style={{ background: "#f8fafc" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div
              className="inline-block rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-widest mb-4"
              style={{ background: "#dcfce7", color: "#15803d" }}
            >
              {t.howBadge}
            </div>
            <h2 className="font-serif text-4xl font-bold mb-3" style={{ color: "#0f172a" }}>
              {t.howH2}
            </h2>
            <p style={{ color: "#64748b" }}>{t.howSub}</p>
          </div>

          <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-0">
            {/* connecting line */}
            <div
              className="absolute hidden lg:block pointer-events-none"
              style={{
                top: 40,
                left: "12.5%",
                right: "12.5%",
                height: 2,
                background: "linear-gradient(90deg, #16a34a, #86efac, #16a34a)",
                borderRadius: 1,
                zIndex: 0,
              }}
            />
            {STEPS.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative z-10 flex flex-col items-center text-center px-4 pb-8"
              >
                <div
                  className="flex flex-col items-center justify-center mb-5"
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: step.comingSoon ? "#f1f5f9" : "linear-gradient(135deg, #16a34a, #22c55e)",
                    border: step.comingSoon ? "2px dashed #cbd5e1" : "none",
                    boxShadow: step.comingSoon ? "none" : "0 8px 20px rgba(22,163,74,0.3)",
                  }}
                >
                  <span className="text-2xl">{step.icon}</span>
                </div>
                {step.comingSoon && (
                  <span
                    className="inline-block text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full mb-2"
                    style={{ background: "#fef3c7", color: "#b45309" }}
                  >
                    {t.comingSoon}
                  </span>
                )}
                <div
                  className="text-xs font-bold uppercase tracking-widest mb-2"
                  style={{ color: "#16a34a" }}
                >
                  {step.number}
                </div>
                <h3
                  className="font-serif text-base font-bold mb-2 leading-snug"
                  style={{ color: step.comingSoon ? "#94a3b8" : "#0f172a" }}
                >
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: step.comingSoon ? "#cbd5e1" : "#64748b" }}>
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AUSTINCARES DAILY DEALS LAUNCH */}
      <section className="py-20 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #faf5ec 0%, #f5ede0 50%, #fdf0e0 100%)" }}>
        {/* decorative blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div style={{ position: "absolute", top: "-60px", right: "-60px", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(217,119,6,0.12) 0%, transparent 70%)" }} />
          <div style={{ position: "absolute", bottom: "-80px", left: "-80px", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)" }} />
          <div style={{ position: "absolute", top: "40%", left: "30%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 65%)" }} />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* left: text */}
            <div className="flex-1 text-center lg:text-left">
              {/* top badge */}
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-6"
                style={{ background: "rgba(16,185,129,0.12)", color: "#059669", border: "1px solid rgba(16,185,129,0.3)" }}
              >
                <span>🆕</span> Now Live
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: 0.1 }}
                className="font-serif font-black leading-tight mb-5"
                style={{ fontSize: "clamp(1.9rem, 5vw, 3.2rem)", color: "#1c1917", letterSpacing: "-0.02em" }}
              >
                Helping solve Austin's{" "}
                <span style={{ background: "linear-gradient(90deg, #059669, #d97706)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  affordability crisis
                </span>
                {" "}—{" "}
                <span style={{ color: "#44403c" }}>one great deal at a time.</span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.18 }}
                className="text-base leading-relaxed mb-8 max-w-lg"
                style={{ color: "#57534e" }}
              >
                <strong style={{ color: "#065f46" }}>Austin Cares Daily Deals</strong> brings you the best local discounts every day of the week — sorted by day and neighborhood, so you always know what's good near you right now.
              </motion.p>

              {/* feature chips */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.28 }}
                className="flex flex-wrap justify-center lg:justify-start gap-3 mb-10"
              >
                {[
                  { icon: "📅", label: "Sorted by day of week" },
                  { icon: "📍", label: "Filtered by neighborhood" },
                  { icon: "⏰", label: "Time-boxed discounts" },
                  { icon: "🏪", label: "Local businesses only" },
                ].map((chip) => (
                  <span
                    key={chip.label}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
                    style={{ background: "rgba(255,255,255,0.7)", color: "#44403c", border: "1px solid rgba(120,80,40,0.15)" }}
                  >
                    {chip.icon} {chip.label}
                  </span>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: 0.36 }}
                className="flex flex-wrap justify-center lg:justify-start gap-4"
              >
                <a
                  href="https://austincares.eventcarpooling.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-bold text-sm no-underline px-7 py-3 rounded-full transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(90deg, #10b981, #059669)", color: "#fff", boxShadow: "0 4px 16px rgba(16,185,129,0.3)" }}
                >
                  Browse today's deals →
                </a>
                <a
                  href="https://austincares.eventcarpooling.com/full"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-bold text-sm no-underline px-7 py-3 rounded-full transition-opacity hover:opacity-80"
                  style={{ background: "transparent", color: "#1c1917", border: "1.5px solid rgba(28,25,23,0.3)" }}
                >
                  Add your deal
                </a>
              </motion.div>
            </div>

            {/* right: deal card mockup */}
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex-shrink-0 w-full max-w-xs"
            >
              <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(120,80,40,0.15)", boxShadow: "0 8px 32px rgba(120,80,40,0.1)" }}>
                {/* card header */}
                <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #f5ede0" }}>
                  <div className="flex items-center gap-2">
                    <img src="/austin-cares-logo.png" alt="Austin Cares" className="w-7 h-7 rounded-lg object-cover" />
                    <span className="text-sm font-bold" style={{ color: "#065f46" }}>Austin Cares Deals</span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "#fef3c7", color: "#92400e" }}>TODAY</span>
                </div>
                {/* sample deal rows */}
                {[
                  { day: "MON", emoji: "☕", name: "Spokesman Coffee", deal: "Free drip with any pastry" },
                  { day: "TUE", emoji: "🍛", name: "Sangam Chettinad", deal: "15% off dine-in lunch" },
                  { day: "WED", emoji: "🥗", name: "Masala Wok", deal: "Buy one bowl, get one 50% off" },
                ].map((item, i) => (
                  <div
                    key={item.day}
                    className="px-5 py-3.5 flex items-center gap-3"
                    style={{ borderBottom: i < 2 ? "1px solid #f5ede0" : "none", opacity: i === 0 ? 1 : 0.6 }}
                  >
                    <span className="text-2xl">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold" style={{ color: "#059669" }}>{item.day}</p>
                      <p className="text-sm font-semibold truncate" style={{ color: "#1c1917" }}>{item.name}</p>
                      <p className="text-xs truncate" style={{ color: "#78716c" }}>{item.deal}</p>
                    </div>
                  </div>
                ))}
                <div className="px-5 py-3 text-center" style={{ background: "#faf5ec" }}>
                  <span className="text-xs" style={{ color: "#a8a29e" }}>+ more deals every day</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SUPERCONNECTOR COMING SOON */}
      <section className="py-20 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1e0a3c 0%, #3b0764 40%, #1e1b4b 100%)" }}>
        {/* decorative blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div style={{ position: "absolute", top: "-80px", left: "-80px", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.35) 0%, transparent 70%)" }} />
          <div style={{ position: "absolute", bottom: "-60px", right: "-60px", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(250,204,21,0.2) 0%, transparent 70%)" }} />
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 65%)" }} />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* top badge */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-8"
            style={{ background: "rgba(250,204,21,0.15)", color: "#fde047", border: "1px solid rgba(250,204,21,0.3)" }}
          >
            <span>⚡</span> {t.gameBadge}
          </motion.div>

          {/* trophy */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
            className="text-7xl mb-6 select-none"
          >
            🏆
          </motion.div>

          {/* headline */}
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.15 }}
            className="font-serif font-black leading-tight mb-4"
            style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)", color: "#fff", letterSpacing: "-0.02em" }}
          >
            {t.gameH2a}
            <br />
            <span style={{ background: "linear-gradient(90deg, #a855f7, #facc15, #f97316, #a855f7)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              {t.gameH2b}
            </span>
          </motion.h2>

          {/* coming soon pill */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="inline-flex items-center gap-2 rounded-full px-6 py-2 mb-8 font-black text-lg uppercase tracking-widest"
            style={{ background: "linear-gradient(90deg, #7c3aed, #a855f7)", color: "#fff", boxShadow: "0 0 32px rgba(168,85,247,0.5), 0 0 64px rgba(168,85,247,0.2)" }}
          >
            {t.gameComingSoon}
          </motion.div>

          {/* description */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-lg leading-relaxed max-w-2xl mx-auto mb-12"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            {t.gameDesc}
          </motion.p>

          {/* feature chips */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.38 }}
            className="flex flex-wrap justify-center gap-3"
          >
            {[
              { icon: "⚡", label: t.gameChip1 },
              { icon: "🔥", label: t.gameChip2 },
              { icon: "🎖️", label: t.gameChip3 },
              { icon: "📅", label: t.gameChip4 },
              { icon: "🏅", label: t.gameChip5 },
            ].map((f) => (
              <span
                key={f.label}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
              >
                {f.icon} {f.label}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* THE RIDE — UPCOMING FEATURE */}
      <section className="py-16 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0f2c1e 0%, #1a3a28 50%, #0d2318 100%)" }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div style={{ position: "absolute", top: "-60px", right: "-60px", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(52,211,153,0.2) 0%, transparent 70%)" }} />
          <div style={{ position: "absolute", bottom: "-40px", left: "-40px", width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)" }} />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div
              className="inline-flex items-center gap-2 rounded-full px-5 py-1.5 mb-6 text-xs font-bold uppercase tracking-widest"
              style={{ background: "rgba(52,211,153,0.15)", color: "#6ee7b7", border: "1px solid rgba(52,211,153,0.3)" }}
            >
              🚗 {t.rideBadge}
            </div>
            <div className="text-5xl mb-4">🤝</div>
            <h2 className="font-serif font-black text-3xl sm:text-4xl mb-5" style={{ color: "#ecfdf5", letterSpacing: "-0.02em" }}>
              {t.rideH2}
            </h2>
            <p className="text-lg leading-relaxed mb-8" style={{ color: "#a7f3d0" }}>
              {t.rideDesc}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { icon: "🏥", label: t.rideChip1 },
                { icon: "🎓", label: t.rideChip2 },
                { icon: "🛒", label: t.rideChip3 },
                { icon: "💼", label: t.rideChip4 },
              ].map((f) => (
                <span
                  key={f.label}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
                  style={{ background: "rgba(255,255,255,0.07)", color: "rgba(167,243,208,0.9)", border: "1px solid rgba(52,211,153,0.2)" }}
                >
                  {f.icon} {f.label}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CATEGORY SHOWCASE */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div
              className="inline-block rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-widest mb-4"
              style={{ background: "#dcfce7", color: "#15803d" }}
            >
              {t.catBadge}
            </div>
            <h2 className="font-serif text-4xl font-bold mb-3" style={{ color: "#0f172a" }}>
              {t.catH2}
            </h2>
            <p style={{ color: "#64748b" }}>
              {t.catSub}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CATEGORY_KEYS.map((cat, i) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: cat.bg,
                  border: `1px solid ${cat.border}30`,
                  borderLeft: `4px solid ${cat.border}`,
                }}
              >
                <div className="p-6 pb-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                    >
                      {cat.emoji}
                    </div>
                    <h3 className="font-serif text-lg font-bold" style={{ color: "#0f172a" }}>{cat.name}</h3>
                  </div>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: "#475569" }}>{CAT_DESCS[cat.name]}</p>
                </div>
                <div
                  className="px-6 pb-5 pt-3 flex flex-wrap gap-1.5"
                  style={{ borderTop: `1px solid ${cat.border}20` }}
                >
                  {cat.sources.map(source => (
                    <span
                      key={source}
                      className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ background: cat.badge, color: cat.badgeText }}
                    >
                      {source}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}

            {/* Features card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="rounded-2xl p-6 flex flex-col justify-center gap-4"
              style={{ border: "2px dashed #e2e8f0", background: "#f8fafc" }}
            >
              <h3 className="font-serif text-lg font-bold" style={{ color: "#0f172a" }}>{t.catJustWorks}</h3>
              <ul className="space-y-3">
                {FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "#475569" }}>
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "#dcfce7" }}
                    >
                      <Check className="w-3 h-3" style={{ color: "#16a34a" }} strokeWidth={3} />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* LIVE CITIES */}
      <section className="py-20 border-t border-border" style={{ background: "#f8fafc" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div
              className="inline-block rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-widest mb-4"
              style={{ background: "#dcfce7", color: "#15803d" }}
            >
              {t.liveBadge}
            </div>
            <h2 className="font-serif text-4xl font-bold mb-3" style={{ color: "#0f172a" }}>{t.liveH2}</h2>
            <p style={{ color: "#64748b" }}>
              {t.liveSub}
            </p>
          </div>

          {loadingTenants ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-36 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : tenants && tenants.filter((t) => ["austin", "stlouis", "tokyo", "sacramento", "portland", "bulverde"].includes(t.slug)).length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {tenants.filter((t) => ["austin", "stlouis", "tokyo", "sacramento", "portland", "bulverde"].includes(t.slug))
                .sort((a, b) => ["austin", "stlouis", "tokyo", "sacramento", "portland", "bulverde"].indexOf(a.slug) - ["austin", "stlouis", "tokyo", "sacramento", "portland", "bulverde"].indexOf(b.slug))
                .map((tenant, i) => {
                const CardEl = motion.a;
                const cardProps = { href: `https://${tenant.slug}.eventcarpooling.com` };

                let iconContent: React.ReactNode;
                let iconStyle: React.CSSProperties;
                if (tenant.slug === "austin") {
                  iconContent = "🎸";
                  iconStyle = { background: "linear-gradient(135deg, #1e1b4b, #312e81)", boxShadow: "0 6px 20px rgba(49,46,129,0.45)" };
                } else if (tenant.slug === "sacramento") {
                  iconContent = "👑";
                  iconStyle = { background: "linear-gradient(135deg, #1a0a30, #5A2D81)", boxShadow: "0 6px 20px rgba(90,45,129,0.45)" };
                } else if (tenant.slug === "stlouis") {
                  iconContent = (
                    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 44, height: 44 }}>
                      {/* Gateway Arch — tapered catenary legs meeting at the apex */}
                      <path
                        d="M10 43 L14 43 C14 30 24 10 24 10 C24 10 34 30 34 43 L38 43 C38 27 26 5 24 5 C22 5 10 27 10 43 Z"
                        fill="rgba(255,255,255,0.95)"
                      />
                    </svg>
                  );
                  iconStyle = { background: "linear-gradient(135deg, #0c1a3a, #1a3a6e)", boxShadow: "0 6px 20px rgba(12,26,58,0.55)" };
                } else if (tenant.slug === "tokyo") {
                  iconContent = "🗼";
                  iconStyle = { background: "linear-gradient(135deg, #4d0000, #CC0000)", boxShadow: "0 6px 20px rgba(204,0,0,0.45)" };
                } else if (tenant.slug === "portland") {
                  iconContent = "🌹";
                  iconStyle = { background: "linear-gradient(135deg, #1a3a1a, #2d6a2d)", boxShadow: "0 6px 20px rgba(45,106,45,0.45)" };
                } else if (tenant.slug === "bulverde") {
                  iconContent = "🌳";
                  iconStyle = { background: "linear-gradient(135deg, #162010, #2a4015)", boxShadow: "0 6px 20px rgba(22,32,16,0.5)" };
                } else {
                  iconContent = tenant.name.charAt(0);
                  iconStyle = { background: `linear-gradient(135deg, ${tenant.accentColor}, ${tenant.accentColor}cc)`, color: "#fff", fontSize: "1.5rem", fontWeight: 700, fontFamily: "Georgia, serif" };
                }

                return (
                  <CardEl
                    key={tenant.slug}
                    {...cardProps}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="group flex flex-col rounded-2xl overflow-hidden bg-white border border-border transition-all hover:border-primary/40 hover:shadow-md"
                    style={{ textDecoration: "none" }}
                  >
                    {/* accent top bar */}
                    <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${tenant.accentColor}, ${tenant.accentColor}99)` }} />
                    <div className="p-6 flex flex-col gap-3 flex-1">
                      <div className="flex items-start justify-between">
                        <div
                          className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg text-4xl"
                          style={iconStyle}
                        >
                          {iconContent}
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                      </div>
                      <div>
                        <h3 className="font-serif font-bold" style={{ color: "#0f172a" }}>{tenant.name}</h3>
                        <p className="text-sm" style={{ color: "#64748b" }}>{tenant.city}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-auto">
                        {tenant.categories.slice(0, 4).map(cat => (
                          <span key={cat} className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {cat}
                          </span>
                        ))}
                        {tenant.categories.length > 4 && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            +{tenant.categories.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  </CardEl>
                );
              })}
              {/* "Your city" placeholder */}
              <div
                className="flex flex-col items-center justify-center gap-3 rounded-2xl p-8 text-center"
                style={{ border: "2px dashed #d1fae5", background: "#fff", minHeight: 180 }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "#f0fdf4", border: "2px dashed #86efac" }}
                >
                  <MapPin className="w-5 h-5" style={{ color: "#16a34a" }} />
                </div>
                <div className="font-bold" style={{ color: "#16a34a" }}>{t.liveYourCityNext}</div>
                <div className="text-sm" style={{ color: "#64748b" }}>{t.liveJoinMinutes}</div>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div
                className="flex flex-col items-center justify-center gap-3 rounded-2xl p-8 text-center"
                style={{ border: "2px dashed #d1fae5", background: "#fff", minHeight: 180 }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "#f0fdf4", border: "2px dashed #86efac" }}
                >
                  <MapPin className="w-5 h-5" style={{ color: "#16a34a" }} />
                </div>
                <div className="font-bold" style={{ color: "#16a34a" }}>{t.liveYourCityFirst}</div>
                <div className="text-sm" style={{ color: "#64748b" }}>{t.liveStartWave}</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* LAUNCH CTA */}
      <section
        id="launch"
        className="relative overflow-hidden py-24 text-center"
        style={{ background: "linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative max-w-2xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-serif text-5xl font-bold text-white mb-5 leading-tight">
              {t.ctaH2}
            </h2>
            <p className="text-lg mb-10 leading-relaxed" style={{ color: "#bbf7d0" }}>
              {t.ctaSub}
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2.5 rounded-full bg-white px-10 py-4 text-base font-bold transition-all hover:-translate-y-0.5"
              style={{ color: "#16a34a", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
            >
              {t.ctaButton} <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-sm mt-4" style={{ color: "#86efac" }}>{t.ctaNoCard}</p>
          </motion.div>
        </div>
      </section>

      <LaunchCityModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
}

export default function PlatformHome() {
  return (
    <PlatformLayout>
      <PlatformHomeInner />
    </PlatformLayout>
  );
}
