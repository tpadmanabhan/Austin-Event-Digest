import { useEffect, useRef, useState } from "react";
import { TurnstileWithRef, useTurnstileRef } from "@/components/turnstile-widget";
import type { TurnstileInstance } from "@/components/turnstile-widget";

const C = {
  cream:    "#FBF3E7",
  paper:    "#FFFDFA",
  char:     "#241C15",
  muted:    "#6B6055",
  line:     "#EDE1CF",
  rust:     "#C4502B",
  rustDeep: "#A33F20",
  gold:     "#E8A93C",
  olive:    "#5C6E4A",
  oliveSoft:"#E7ECE0",
  brown:    "#4A4038",
};

const serif: React.CSSProperties = { fontFamily: "'Fraunces', Georgia, serif" };

const DEAL_LOCATIONS = [
  { name: "Spokesman Coffee",           deal: "Mon: Free drip coffee with any pastry",              lat: 30.3330, lng: -97.7388 },
  { name: "Lou's Barton Springs",       deal: "Mon–Wed: Half-off chicken, $10 shots, half-off burgers", lat: 30.2638, lng: -97.7529 },
  { name: "Siena Austin",              deal: "Mon: $26 pasta dinner · Tue: $45 three-course",      lat: 30.3640, lng: -97.7700 },
  { name: "Eureka! Restaurant",         deal: "Mon: $10 martinis all day",                          lat: 30.2671, lng: -97.7404 },
  { name: "Nômadé Cocina",             deal: "Wed: 50% off wine · Weekdays: $10 marg + 2 tacos",   lat: 30.2461, lng: -97.7566 },
  { name: "Masala Wok",                deal: "Tue: Tikka Masala + Naan + Drink — $11.95",          lat: 30.4161, lng: -97.7354 },
  { name: "Rasoi Indian Restaurant",    deal: "Any day: $25 toward food & drinks",                  lat: 30.4350, lng: -97.7900 },
  { name: "Flow Yoga Austin",          deal: "Sat 9 AM: Free outdoor yoga in the park",            lat: 30.2588, lng: -97.7683 },
  { name: "Austin Public Health",       deal: "Any day: Free vaccines & health screenings",         lat: 30.2513, lng: -97.6951 },
  { name: "Austin Habitat Counseling",  deal: "Any day: Free homeownership & financial counseling", lat: 30.2280, lng: -97.7757 },
];

// ---------------------------------------------------------------------------
// Inline subscribe form (email-only, rust/cream branded)
// ---------------------------------------------------------------------------
function SubscribeSection() {
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useTurnstileRef<TurnstileInstance | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const resetCaptcha = () => {
    setCaptchaToken(null);
    turnstileRef.current?.reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), captchaToken }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
      } else {
        setError(data.message || "Something went wrong. Please try again.");
        resetCaptcha();
      }
    } catch {
      setError("Network error — please try again.");
      resetCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="subscribe"
      style={{ background: `linear-gradient(175deg, ${C.char} 0%, #3A2E24 100%)`, padding: "80px 0" }}
    >
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
        {done ? (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h2 style={{ ...serif, fontSize: "clamp(24px, 3.4vw, 32px)", fontWeight: 600, color: "#fff", marginBottom: 12 }}>
              You're on the list!
            </h2>
            <p style={{ color: "#C9BFAE", fontSize: 16.5 }}>
              Look out for this Sunday's deals in your inbox.
            </p>
          </>
        ) : (
          <>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 100, padding: "6px 14px", fontSize: 12.5, fontWeight: 600, color: "#E8A93C", marginBottom: 20 }}>
              ● Free · No spam · Unsubscribe anytime
            </span>
            <h2 style={{ ...serif, fontSize: "clamp(26px, 3.8vw, 38px)", fontWeight: 600, color: "#fff", lineHeight: 1.12, marginBottom: 12 }}>
              Get this week's deals in your inbox.
            </h2>
            <p style={{ color: "#C9BFAE", fontSize: 16.5, marginBottom: 32 }}>
              Every Sunday — real, time-boxed discounts near you. No coupons, no expired offers.
            </p>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "stretch" }}>
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  height: 52, borderRadius: 12, border: `1.5px solid rgba(255,255,255,0.18)`,
                  background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 16,
                  padding: "0 18px", outline: "none", width: "100%", boxSizing: "border-box",
                }}
                onFocus={e => { e.currentTarget.style.borderColor = C.rust; }}
                onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
              />
              <div style={{ borderRadius: 10, overflow: "hidden" }}>
                <TurnstileWithRef
                  turnstileRef={turnstileRef}
                  onSuccess={setCaptchaToken}
                  onError={resetCaptcha}
                  onExpire={resetCaptcha}
                />
              </div>
              {error && (
                <p style={{ color: "#F87171", fontSize: 13.5, margin: 0 }}>{error}</p>
              )}
              <button
                type="submit"
                disabled={submitting || !captchaToken}
                style={{
                  height: 52, borderRadius: 12, border: "none", cursor: submitting || !captchaToken ? "not-allowed" : "pointer",
                  background: submitting || !captchaToken ? "#7a5a4a" : C.rust,
                  color: "#fff", fontWeight: 700, fontSize: 15.5,
                  boxShadow: submitting || !captchaToken ? "none" : "0 10px 26px rgba(196,80,43,.35)",
                  transition: "background 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={e => { if (!submitting && captchaToken) e.currentTarget.style.background = C.rustDeep; }}
                onMouseLeave={e => { if (!submitting && captchaToken) e.currentTarget.style.background = C.rust; }}
              >
                {submitting ? "Subscribing…" : "Get Weekly Deals — Free"}
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Business inquiry modal
// ---------------------------------------------------------------------------
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Multiple days", "Any day"];

function BusinessModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ businessName: "", email: "", dealDescription: "", dayOfWeek: "" });
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useTurnstileRef<TurnstileInstance | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const resetCaptcha = () => {
    setCaptchaToken(null);
    turnstileRef.current?.reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/newsletter/business-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, captchaToken }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
      } else {
        setError(data.message || "Something went wrong. Please try again.");
        resetCaptcha();
      }
    } catch {
      setError("Network error — please try again.");
      resetCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", height: 46, borderRadius: 10,
    border: `1.5px solid ${C.line}`, background: C.paper, color: C.char,
    fontSize: 14.5, padding: "0 14px", outline: "none", fontFamily: "'Inter', system-ui, sans-serif",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: C.paper, borderRadius: 20, padding: "36px 32px", maxWidth: 480, width: "100%", boxShadow: "0 32px 80px rgba(0,0,0,0.3)", position: "relative" }}>
        <button
          onClick={onClose}
          style={{ position: "absolute", top: 16, right: 16, border: "none", background: "none", cursor: "pointer", fontSize: 22, color: C.muted, lineHeight: 1 }}
          aria-label="Close"
        >
          ×
        </button>

        {done ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h3 style={{ ...serif, fontSize: 26, fontWeight: 600, color: C.char, marginBottom: 10 }}>We'll be in touch!</h3>
            <p style={{ color: C.muted, fontSize: 15.5, lineHeight: 1.6 }}>
              Check your inbox for a confirmation. We typically follow up within 1–2 business days.
            </p>
            <button
              onClick={onClose}
              style={{ marginTop: 24, padding: "12px 28px", borderRadius: 10, background: C.rust, color: "#fff", border: "none", fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h3 style={{ ...serif, fontSize: "clamp(20px, 3vw, 26px)", fontWeight: 600, color: C.char, marginBottom: 6 }}>
              List your business
            </h3>
            <p style={{ color: C.muted, fontSize: 14.5, marginBottom: 24, lineHeight: 1.55 }}>
              Tell us about your weekly deal and we'll be in touch to get it into the next digest.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.char, marginBottom: 5 }}>
                  Business name <span style={{ color: C.rust }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spokesman Coffee"
                  value={form.businessName}
                  onChange={set("businessName")}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.char, marginBottom: 5 }}>
                  Your email <span style={{ color: C.rust }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="owner@yourbusiness.com"
                  value={form.email}
                  onChange={set("email")}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.char, marginBottom: 5 }}>
                  Your weekly deal or special
                </label>
                <textarea
                  placeholder="e.g. Free drip coffee with any pastry — Mondays only, dine-in"
                  value={form.dealDescription}
                  onChange={set("dealDescription")}
                  rows={3}
                  style={{ ...inputStyle, height: "auto", padding: "12px 14px", resize: "vertical" as const }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.char, marginBottom: 5 }}>
                  Day(s) it runs
                </label>
                <select
                  value={form.dayOfWeek}
                  onChange={set("dayOfWeek")}
                  style={{ ...inputStyle, appearance: "none" as const, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B6055' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center" }}
                >
                  <option value="">Select a day…</option>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div style={{ borderRadius: 10, overflow: "hidden" }}>
                <TurnstileWithRef
                  turnstileRef={turnstileRef}
                  onSuccess={setCaptchaToken}
                  onError={resetCaptcha}
                  onExpire={resetCaptcha}
                />
              </div>

              {error && (
                <p style={{ color: C.rust, fontSize: 13.5, margin: 0, fontWeight: 500 }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting || !captchaToken}
                style={{
                  marginTop: 4, height: 50, borderRadius: 12, border: "none",
                  cursor: submitting || !captchaToken ? "not-allowed" : "pointer",
                  background: submitting || !captchaToken ? "#a0837a" : C.rust,
                  color: "#fff", fontWeight: 700, fontSize: 15.5,
                  boxShadow: submitting || !captchaToken ? "none" : "0 10px 26px rgba(196,80,43,.28)",
                  transition: "background 0.15s",
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
                onMouseEnter={e => { if (!submitting && captchaToken) e.currentTarget.style.background = C.rustDeep; }}
                onMouseLeave={e => { if (!submitting && captchaToken) e.currentTarget.style.background = C.rust; }}
              >
                {submitting ? "Sending…" : "Submit inquiry →"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function AustinCaresDeals() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const [bizModalOpen, setBizModalOpen] = useState(false);

  const scrollToSubscribe = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById("subscribe")?.scrollIntoView({ behavior: "smooth" });
  };

  // Business deal map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    let mounted = true;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (!mounted || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [30.33, -97.73],
        zoom: 11,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      DEAL_LOCATIONS.forEach((biz) => {
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:30px;height:30px;border-radius:50%;
            background:#C4502B;border:2.5px solid #F4B49A;
            box-shadow:0 2px 8px rgba(0,0,0,0.35);
            display:flex;align-items:center;justify-content:center;
            font-size:14px;line-height:1;
          ">📍</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          tooltipAnchor: [0, -18],
        });

        L.marker([biz.lat, biz.lng], { icon })
          .addTo(map)
          .bindTooltip(
            `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-width:160px;">
              <strong style="font-size:13px;display:block;margin-bottom:3px;">${biz.name}</strong>
              <span style="font-size:12px;color:#C4502B;font-weight:600;">${biz.deal}</span>
            </div>`,
            { direction: "top", offset: [0, -8], opacity: 1 }
          );
      });

      const latlngs = DEAL_LOCATIONS.map((b) => [b.lat, b.lng] as [number, number]);
      map.fitBounds(latlngs, { padding: [48, 48], maxZoom: 13 });
    })();
    return () => {
      mounted = false;
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Inject Google Fonts
  useEffect(() => {
    const id = "austincares-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: C.paper, color: C.char, lineHeight: 1.55, WebkitFontSmoothing: "antialiased" }}>

      {bizModalOpen && <BusinessModal onClose={() => setBizModalOpen(false)} />}

      {/* ── NAV ── */}
      <nav style={{ padding: "20px 0" }}>
        <div style={{ maxWidth: 1020, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ ...serif, fontWeight: 600, fontSize: 21, letterSpacing: "-0.01em", color: C.char }}>
                Austin<span style={{ color: C.rust }}>Cares</span>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", background: "#FBBF24", borderRadius: 100, padding: "2px 8px", lineHeight: 1 }}>
                <span style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "#78350F" }}>Beta</span>
              </span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted }}>Daily Deals Nearby</span>
          </div>
          <button
            onClick={() => setBizModalOpen(true)}
            style={{ color: C.char, background: "transparent", textDecoration: "none", fontSize: 14.5, fontWeight: 600, border: `1.5px solid ${C.char}`, padding: "9px 16px", borderRadius: 100, cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif" }}
            onMouseEnter={e => { e.currentTarget.style.background = C.char; e.currentTarget.style.color = C.paper; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.char; }}
          >
            I run a business →
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <header style={{ background: `linear-gradient(175deg, ${C.cream} 0%, #F6E4CC 100%)`, padding: "56px 0 64px", position: "relative", overflow: "hidden" }}>
        <div style={{ maxWidth: 1020, margin: "0 auto", padding: "0 24px", position: "relative", zIndex: 1 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 100, padding: "6px 14px", fontSize: 12.5, fontWeight: 600, color: C.rustDeep }}>
            ● Updated every week
          </span>
          <h1 style={{ ...serif, fontWeight: 600, fontSize: "clamp(34px, 5.6vw, 54px)", lineHeight: 1.08, letterSpacing: "-0.015em", marginTop: 20, maxWidth: "14ch" }}>
            The best deal in Austin — <em style={{ fontStyle: "italic", color: C.rust }}>every day of the week.</em>
          </h1>
          <p style={{ marginTop: 18, fontSize: 19, color: C.brown, maxWidth: "46ch" }}>
            A weekly digest of real, time-boxed discounts near you — happy hours, Tuesday specials, weekday-only deals — filtered by day and distance. No hunting through Instagram. No expired coupons.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" as const, marginTop: 32 }}>
            <button
              onClick={scrollToSubscribe}
              style={{ display: "inline-block", textDecoration: "none", fontWeight: 700, fontSize: 15.5, padding: "14px 25px", borderRadius: 12, background: C.rust, color: "#fff", boxShadow: `0 10px 26px rgba(196,80,43,.28)`, border: "none", cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif" }}
              onMouseEnter={e => { e.currentTarget.style.background = C.rustDeep; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.rust; }}
            >
              Get Weekly Deals
            </button>
            <a
              href="/full"
              style={{ display: "inline-block", textDecoration: "none", fontWeight: 700, fontSize: 15.5, padding: "14px 25px", borderRadius: 12, background: C.char, color: "#fff", border: "none", cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif" }}
            >
              See this week's deals →
            </a>
            <button
              onClick={() => setBizModalOpen(true)}
              style={{ display: "inline-block", textDecoration: "none", fontWeight: 700, fontSize: 15.5, padding: "14px 25px", borderRadius: 12, background: "transparent", color: C.char, border: `1.5px solid ${C.char}`, cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif" }}
              onMouseEnter={e => { e.currentTarget.style.background = C.char; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.char; }}
            >
              I run a business →
            </button>
          </div>
          {/* Day strip — today's pill is highlighted automatically */}
          <div style={{ display: "flex", gap: 8, marginTop: 40, flexWrap: "wrap" as const }}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
              // getDay(): 0=Sun…6=Sat → shift so Mon=0…Sun=6
              const todayIdx = (new Date().getDay() + 6) % 7;
              const active = i === todayIdx;
              return (
                <div
                  key={day}
                  style={{
                    background: active ? C.char : C.paper,
                    border: `1px solid ${active ? C.char : C.line}`,
                    borderRadius: 11,
                    padding: "9px 15px",
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: active ? C.paper : C.muted,
                  }}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "78px 0" }}>
        <div style={{ maxWidth: 1020, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ maxWidth: "38ch", marginBottom: 40 }}>
            <h2 style={{ ...serif, fontSize: "clamp(24px, 3.4vw, 32px)", fontWeight: 600, letterSpacing: "-0.01em" }}>
              Deals, sorted the way you actually decide.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {[
              { n: "1", title: "Sorted by day",       body: "Monday oyster nights. Tuesday tikka. Thursday happy hours. See what's on, the day it's on — not a stale list from three weeks ago." },
              { n: "2", title: "Sorted by distance",  body: "Set your spot, get deals within 1, 3, or 5 miles. Not a citywide list you'll never make it across town for." },
              { n: "3", title: "Verified and current", body: "Every deal is pulled and checked weekly. If it's expired, it's gone — not left up to rot like an old coupon site." },
            ].map(({ n, title, body }) => (
              <div key={n} style={{ background: C.cream, borderRadius: 16, padding: "26px 22px" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: C.rust, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", ...serif, fontWeight: 600, fontSize: 17, marginBottom: 14 }}>
                  {n}
                </div>
                <h3 style={{ fontSize: 16.5, fontWeight: 700 }}>{title}</h3>
                <p style={{ fontSize: 14.5, color: C.muted, marginTop: 6 }}>{body}</p>
              </div>
            ))}
            {/* Add your deal CTA card */}
            <button
              onClick={() => setBizModalOpen(true)}
              style={{ textDecoration: "none", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" as const }}
            >
              <div style={{ background: C.cream, borderRadius: 16, padding: "26px 22px", border: `2px dashed ${C.rust}`, height: "100%", boxSizing: "border-box" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: C.rust, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 22, marginBottom: 14, lineHeight: 1 }}>
                  +
                </div>
                <h3 style={{ fontSize: 16.5, fontWeight: 700, color: C.char }}>Add your deal</h3>
                <p style={{ fontSize: 14.5, color: C.muted, marginTop: 6 }}>Own a business with a weekly special? Submit it — it takes two minutes and goes out in Sunday's digest.</p>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* ── SAMPLE DIGEST ── */}
      <section style={{ background: C.char, color: C.cream, padding: "74px 0" }}>
        <div style={{ maxWidth: 1020, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ maxWidth: "40ch" }}>
            <h2 style={{ ...serif, fontSize: "clamp(24px, 3.4vw, 32px)", fontWeight: 600, color: "#fff" }}>
              This week, near South Congress
            </h2>
            <p style={{ color: "#C9BFAE", marginTop: 10, fontSize: 16.5 }}>
              A real sample of what lands in your inbox every Sunday.
            </p>
          </div>
          <div style={{ background: C.paper, color: C.char, borderRadius: 18, marginTop: 36, overflow: "hidden", boxShadow: "0 30px 60px rgba(0,0,0,.28)" }}>
            <div style={{ background: C.rust, color: "#fff", padding: "16px 22px", ...serif, fontSize: 15.5 }}>
              AustinCares · Weekly Deals · South Congress ± 3 mi
            </div>
            <div style={{ padding: 22 }}>
              {[
                { day: "MON", biz: "Spokesman Coffee",           off: "Free drip coffee with any pastry purchase",          meta: "Mondays only · dine-in",     dist: "0.8 mi" },
                { day: "TUE", biz: "Masala Wok — Tikka Tuesday", off: "Tikka Masala + Rice + Naan + Drink — $11.95",        meta: "All-day · dine-in or to-go", dist: "2.1 mi" },
                { day: "ANY", biz: "Rasoi Indian Restaurant",    off: "$25 Toward Food & Drinks — up to 22% off",           meta: "Any day · via Groupon",       dist: "3.4 mi" },
              ].map(({ day, biz, off, meta, dist }, i, arr) => (
                <div key={day} style={{ display: "flex", gap: 14, alignItems: "center", padding: "14px 0", borderBottom: i < arr.length - 1 ? `1px solid ${C.line}` : "none" }}>
                  <div style={{ flexShrink: 0, width: 52, textAlign: "center", background: C.oliveSoft, color: C.olive, fontWeight: 700, fontSize: 12.5, padding: "7px 0", borderRadius: 9 }}>
                    {day}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{biz}</div>
                    <div style={{ color: C.rust, fontWeight: 700, fontSize: 14 }}>{off}</div>
                    <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>{meta}</div>
                  </div>
                  <div style={{ flexShrink: 0, fontSize: 12.5, color: C.muted, fontWeight: 600 }}>{dist}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: "0 22px 20px", textAlign: "right" }}>
              <button
                onClick={scrollToSubscribe}
                style={{ fontSize: 14, fontWeight: 700, color: C.gold, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.01em", fontFamily: "'Inter', system-ui, sans-serif" }}
              >
                Get deals like these in your inbox →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── DEAL MAP ── */}
      <section style={{ background: C.cream, padding: "64px 0" }}>
        <div style={{ maxWidth: 1020, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{ ...serif, fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 600, color: C.char, marginBottom: 8 }}>
            Where to find this week's deals
          </h2>
          <p style={{ fontSize: 16, color: C.muted, marginBottom: 28 }}>
            Hover a pin to see the business and its offer.
          </p>
          <div
            ref={mapContainerRef}
            style={{ height: 380, borderRadius: 18, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,.12)" }}
          />
        </div>
      </section>

      {/* ── SUBSCRIBE ── */}
      <SubscribeSection />

      {/* ── BUSINESS SECTION ── */}
      <section id="business" style={{ padding: "80px 0" }}>
        <div style={{ maxWidth: 1020, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 44, alignItems: "center" }} className="ac-biz-grid">
            <div>
              <h2 style={{ ...serif, fontSize: "clamp(26px, 3.6vw, 36px)", fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.18 }}>
                Your Tuesday special, in front of people looking for a Tuesday special.
              </h2>
              <p style={{ marginTop: 16, fontSize: 17, color: C.brown, maxWidth: "44ch" }}>
                You're already running the discount. We just make sure the neighborhood sees it — sorted by day, filtered by distance, delivered weekly. No ad spend, no boosting posts and hoping the algorithm cares.
              </p>
            </div>
            <div style={{ background: C.cream, borderRadius: 20, padding: "32px 28px", textAlign: "center" }}>
              <div style={{ ...serif, fontSize: 18, fontWeight: 600, color: C.rust, marginBottom: 20 }}>
                What's included
              </div>
              <ul style={{ listStyle: "none", textAlign: "left", margin: "0 auto 24px", maxWidth: 240 }}>
                {["List your weekly deal", "Sorted by day & geo-matched to nearby readers", "Update anytime", "Cancel anytime"].map(item => (
                  <li key={item} style={{ fontSize: 14.5, paddingLeft: 22, position: "relative", marginBottom: 9, color: C.brown }}>
                    <span style={{ position: "absolute", left: 0, color: C.olive, fontWeight: 700 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setBizModalOpen(true)}
                style={{ display: "block", width: "100%", textDecoration: "none", fontWeight: 700, fontSize: 15.5, padding: "14px 25px", borderRadius: 12, background: C.rust, color: "#fff", boxShadow: `0 10px 26px rgba(196,80,43,.28)`, border: "none", cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif" }}
                onMouseEnter={e => { e.currentTarget.style.background = C.rustDeep; }}
                onMouseLeave={e => { e.currentTarget.style.background = C.rust; }}
              >
                List your business
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL ── */}
      <section style={{ background: C.oliveSoft, padding: "70px 0" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <p style={{ ...serif, fontStyle: "italic", fontSize: "clamp(21px, 3vw, 27px)", lineHeight: 1.42, color: C.char }}>
            "I used to post our happy hour on Instagram and hope the algorithm cared. Now it just shows up in front of people a few blocks away, on the exact day it matters."
          </p>
          <div style={{ marginTop: 20, fontSize: 14.5, color: C.muted, fontWeight: 600 }}>— Local Austin business owner</div>
          <div style={{ display: "inline-block", marginTop: 14, fontSize: 11.5, letterSpacing: "0.06em", textTransform: "uppercase", color: C.olive, background: "#fff", border: `1px solid #D3DCC7`, padding: "4px 12px", borderRadius: 100 }}>
            Sample quote — swap in a real review once live
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: "38px 0", textAlign: "center", color: C.muted, fontSize: 13.5 }}>
        <div style={{ ...serif, fontWeight: 600, fontSize: 21, letterSpacing: "-0.01em", color: C.char, marginBottom: 6 }}>
          Austin<span style={{ color: C.rust }}>Cares</span>
        </div>
        <div>Part of the EventCarpooling network — the best local deals, near you.</div>
      </footer>

      {/* Responsive override for biz grid */}
      <style>{`
        @media (max-width: 760px) {
          .ac-biz-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
