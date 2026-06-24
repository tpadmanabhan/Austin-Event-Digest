import React, { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Check, ExternalLink, ArrowRight, Users, Globe, Star } from "lucide-react";
import { PlatformLayout } from "@/components/platform-layout";
import { LaunchCityModal } from "@/components/launch-city-modal";

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

const CATEGORIES = [
  {
    name: "Tech",
    emoji: "💻",
    description: "Startup meetups, AI demos, developer nights, and founder events.",
    sources: ["Luma", "Meetup", "Eventbrite"],
    border: "#3b82f6",
    bg: "#eff6ff",
    badge: "#dbeafe",
    badgeText: "#1d4ed8",
  },
  {
    name: "Music",
    emoji: "🎵",
    description: "Live concerts, open mics, album releases, and music festivals.",
    sources: ["Bandsintown", "Songkick", "Eventbrite"],
    border: "#a855f7",
    bg: "#faf5ff",
    badge: "#f3e8ff",
    badgeText: "#7e22ce",
  },
  {
    name: "Food & Drink",
    emoji: "🍔",
    description: "Food pop-ups, restaurant openings, farmers markets, and tastings.",
    sources: ["Luma", "Eventbrite"],
    border: "#f97316",
    bg: "#fff7ed",
    badge: "#ffedd5",
    badgeText: "#c2410c",
  },
  {
    name: "Wellness",
    emoji: "🧘",
    description: "Yoga classes, meditation circles, hiking groups, and outdoor fitness.",
    sources: ["Luma", "Meetup", "Eventbrite"],
    border: "#22c55e",
    bg: "#f0fdf4",
    badge: "#dcfce7",
    badgeText: "#15803d",
  },
  {
    name: "Civics",
    emoji: "🏛️",
    description: "City council meetings, neighborhood events, volunteer drives, and community org.",
    sources: ["Meetup", "Eventbrite"],
    border: "#f59e0b",
    bg: "#fffbeb",
    badge: "#fef3c7",
    badgeText: "#b45309",
  },
];

const STEPS = [
  {
    number: "01",
    icon: "📍",
    title: "Pick your city",
    description: "Choose any city and we set up a dedicated subdomain at yourCity.eventcarpooling.com.",
  },
  {
    number: "02",
    icon: "📋",
    title: "Choose your categories",
    description: "Select which event types matter most — Tech, Music, Food, Wellness, or Civics.",
  },
  {
    number: "03",
    icon: "🚀",
    title: "Go live",
    description: "We automatically discover events from top sources and send a polished weekly digest.",
  },
  {
    number: "04",
    icon: "🚗",
    title: "Establish Carpooling with Your Trusted Network",
    description: "Coming soon — coordinate rides to events with people you already know and trust.",
    comingSoon: true,
  },
];

const FEATURES = [
  "Weekly digest auto-generated",
  "Subscribers managed for you",
  "One-click newsletter send",
  "RSVP & carpool coordination",
];

export default function PlatformHome() {
  const { data: tenants, isLoading: loadingTenants } = useTenantList();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <PlatformLayout>
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
                src={`${import.meta.env.BASE_URL}eventcarpooling-logo.png`}
                alt=""
                className="w-5 h-5 object-contain"
              />
              <span className="text-sm font-semibold" style={{ color: "#4ade80" }}>
                Automated city newsletters, powered by real data
              </span>
            </div>

            <h1 className="font-serif font-bold text-white mb-6 leading-[1.15]" style={{ fontSize: "clamp(32px, 4.5vw, 60px)" }}>
              Your city or neighborhood deserves its own events newsletter.{" "}
              <span className="italic" style={{ color: "#4ade80" }}>Be the Superconnector!</span>
            </h1>

            <p className="text-lg mb-10 leading-relaxed max-w-2xl mx-auto" style={{ color: "#94a3b8" }}>
              Launch a weekly events digest for any city in minutes. We automatically discover events
              from Luma, Meetup, Eventbrite, Bandsintown, and more — then send a beautifully curated
              email to your subscribers. Carpooling functionality will be enabled with your trusted network!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-14">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-base font-semibold text-white transition-all hover:-translate-y-0.5"
                style={{
                  background: "linear-gradient(135deg, #16a34a, #22c55e)",
                  boxShadow: "0 8px 24px rgba(22,163,74,0.4)",
                }}
              >
                Launch your city <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href="https://austin.eventcarpooling.com"
                className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
                style={{ color: "#94a3b8" }}
              >
                <ExternalLink className="w-4 h-4" />
                See Austin's newsletter
              </a>
            </div>

            {/* Stats row */}
            <div
              className="flex justify-center"
              style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 40 }}
            >
              {[
                { icon: <Globe className="w-5 h-5" style={{ color: "#4ade80" }} />, value: "1+", label: "Cities live" },
                { icon: <Star className="w-5 h-5" style={{ color: "#4ade80" }} />, value: "5", label: "Event categories" },
                { icon: <Users className="w-5 h-5" style={{ color: "#4ade80" }} />, value: "10+", label: "Data sources" },
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

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20" style={{ background: "#f8fafc" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div
              className="inline-block rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-widest mb-4"
              style={{ background: "#dcfce7", color: "#15803d" }}
            >
              How it works
            </div>
            <h2 className="font-serif text-4xl font-bold mb-3" style={{ color: "#0f172a" }}>
              From zero to newsletter in minutes
            </h2>
            <p style={{ color: "#64748b" }}>Four steps to give your city its own events digest.</p>
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
                    Coming soon
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

      {/* CATEGORY SHOWCASE */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div
              className="inline-block rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-widest mb-4"
              style={{ background: "#dcfce7", color: "#15803d" }}
            >
              Categories
            </div>
            <h2 className="font-serif text-4xl font-bold mb-3" style={{ color: "#0f172a" }}>
              Five categories, dozens of sources
            </h2>
            <p style={{ color: "#64748b" }}>
              Pick the categories that define your city. We pull from the top platforms automatically.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CATEGORIES.map((cat, i) => (
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
                  <p className="text-sm leading-relaxed mb-4" style={{ color: "#475569" }}>{cat.description}</p>
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
              <h3 className="font-serif text-lg font-bold" style={{ color: "#0f172a" }}>And it all just works</h3>
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
              Live cities
            </div>
            <h2 className="font-serif text-4xl font-bold mb-3" style={{ color: "#0f172a" }}>Live cities</h2>
            <p style={{ color: "#64748b" }}>
              These cities are already sending weekly newsletters. Yours could be next.
            </p>
          </div>

          {loadingTenants ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-36 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : tenants && tenants.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {tenants.map((tenant, i) => (
                <motion.a
                  key={tenant.slug}
                  href={`https://${tenant.slug}.eventcarpooling.com`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group flex flex-col rounded-2xl overflow-hidden bg-white border border-border hover:border-primary/40 hover:shadow-md transition-all"
                  style={{ textDecoration: "none" }}
                >
                  {/* accent top bar */}
                  <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${tenant.accentColor}, ${tenant.accentColor}99)` }} />
                  <div className="p-6 flex flex-col gap-3 flex-1">
                    <div className="flex items-start justify-between">
                      <div
                        className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg text-4xl"
                        style={
                          tenant.slug?.includes("austin")
                            ? { background: "linear-gradient(135deg, #1e1b4b, #312e81)", boxShadow: "0 6px 20px rgba(49,46,129,0.45)" }
                            : { background: `linear-gradient(135deg, ${tenant.accentColor}, ${tenant.accentColor}cc)`, color: "#fff", fontSize: "1.5rem", fontWeight: 700, fontFamily: "Georgia, serif" }
                        }
                      >
                        {tenant.slug?.includes("austin") ? "🎸" : tenant.name.charAt(0)}
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
                </motion.a>
              ))}
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
                <div className="font-bold" style={{ color: "#16a34a" }}>Your city could be next</div>
                <div className="text-sm" style={{ color: "#64748b" }}>Join the platform and launch in minutes</div>
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
                <div className="font-bold" style={{ color: "#16a34a" }}>Your city could be first</div>
                <div className="text-sm" style={{ color: "#64748b" }}>Launch today and start the newsletter wave</div>
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
              Ready to launch your city?
            </h2>
            <p className="text-lg mb-10 leading-relaxed" style={{ color: "#bbf7d0" }}>
              Join the platform and give your city the newsletter it deserves.
              Setup takes under five minutes.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2.5 rounded-full bg-white px-10 py-4 text-base font-bold transition-all hover:-translate-y-0.5"
              style={{ color: "#16a34a", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
            >
              Get started — it's free <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-sm mt-4" style={{ color: "#86efac" }}>No credit card required.</p>
          </motion.div>
        </div>
      </section>

      <LaunchCityModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </PlatformLayout>
  );
}
