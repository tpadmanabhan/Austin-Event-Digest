import { MapPin, Check, ExternalLink, ArrowRight, Users, Globe, Star } from "lucide-react";

const CATEGORIES = [
  { name: "Tech", emoji: "💻", description: "Startup meetups, AI demos, developer nights, and founder events.", sources: ["Luma", "Meetup", "Eventbrite"], border: "#3b82f6", bg: "#eff6ff", badge: "#dbeafe", badgeText: "#1d4ed8" },
  { name: "Music", emoji: "🎵", description: "Live concerts, open mics, album releases, and music festivals.", sources: ["Bandsintown", "Songkick", "Eventbrite"], border: "#a855f7", bg: "#faf5ff", badge: "#f3e8ff", badgeText: "#7e22ce" },
  { name: "Food & Drink", emoji: "🍔", description: "Food pop-ups, restaurant openings, farmers markets, and tastings.", sources: ["Luma", "Eventbrite"], border: "#f97316", bg: "#fff7ed", badge: "#ffedd5", badgeText: "#c2410c" },
  { name: "Wellness", emoji: "🧘", description: "Yoga classes, meditation circles, hiking groups, and outdoor fitness.", sources: ["Luma", "Meetup", "Eventbrite"], border: "#22c55e", bg: "#f0fdf4", badge: "#dcfce7", badgeText: "#15803d" },
  { name: "Civics", emoji: "🏛️", description: "City council meetings, neighborhood events, volunteer drives, and community org.", sources: ["Meetup", "Eventbrite"], border: "#f59e0b", bg: "#fffbeb", badge: "#fef3c7", badgeText: "#b45309" },
];

const STEPS = [
  { number: "01", icon: "📍", title: "Pick your city", description: "Choose any city and we set up a dedicated subdomain at yourCity.eventcarpooling.com." },
  { number: "02", icon: "📋", title: "Choose your categories", description: "Select which event types matter most — Tech, Music, Food, Wellness, or Civics." },
  { number: "03", icon: "🚀", title: "Go live", description: "We automatically discover events from top sources and send a polished weekly digest." },
  { number: "04", icon: "🚗", title: "Carpool with Your Trusted Network", description: "Coming soon — coordinate rides to events with people you already know and trust.", comingSoon: true },
];

const FEATURES = [
  "Weekly digest auto-generated",
  "Subscribers managed for you",
  "One-click newsletter send",
  "RSVP & carpool coordination",
];

export function Improved() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#fff", minHeight: "100vh" }}>

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e5e7eb", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/__mockup/images/eventcarpooling-logo.png" alt="EventCarpooling" style={{ width: 40, height: 40, objectFit: "contain" }} />
          <span style={{ fontWeight: 700, fontSize: 18, color: "#111827", fontFamily: "'Georgia', serif" }}>EventCarpooling</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <a href="#" style={{ fontSize: 14, color: "#6b7280", textDecoration: "none", fontWeight: 500 }}>How it works</a>
          <span style={{ fontSize: 12, fontWeight: 700, background: "#fef3c7", color: "#b45309", padding: "2px 10px", borderRadius: 20, border: "1px solid #fde68a", letterSpacing: "0.05em", textTransform: "uppercase" }}>Beta</span>
          <button style={{ background: "linear-gradient(135deg, #16a34a, #22c55e)", color: "#fff", border: "none", borderRadius: 24, padding: "8px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 12px rgba(22,163,74,0.3)" }}>Launch your city</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #14532d 100%)", padding: "80px 32px 96px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        {/* grid overlay */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(34,197,94,0.08) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />
        {/* glow */}
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 300, background: "radial-gradient(ellipse, rgba(34,197,94,0.15), transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 24, padding: "6px 16px", marginBottom: 32 }}>
            <img src="/__mockup/images/eventcarpooling-logo.png" alt="" style={{ width: 18, height: 18, objectFit: "contain" }} />
            <span style={{ fontSize: 13, color: "#4ade80", fontWeight: 600 }}>Automated city newsletters, powered by real data</span>
          </div>

          <h1 style={{ fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 800, color: "#fff", margin: "0 0 24px", lineHeight: 1.1, fontFamily: "'Georgia', serif" }}>
            Your city deserves its{" "}
            <span style={{ color: "#4ade80", fontStyle: "italic" }}>own newsletter.</span>
          </h1>

          <p style={{ fontSize: 18, color: "#94a3b8", margin: "0 0 40px", lineHeight: 1.7, maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>
            Launch a weekly events digest for any city in minutes. We automatically discover events
            from Luma, Meetup, Eventbrite, Bandsintown, and more — then send a beautifully curated
            email to your subscribers. Carpooling functionality will be enabled with your trusted network!
          </p>

          <div style={{ display: "flex", gap: 16, justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginBottom: 56 }}>
            <button style={{ background: "linear-gradient(135deg, #16a34a, #22c55e)", color: "#fff", border: "none", borderRadius: 32, padding: "14px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 24px rgba(22,163,74,0.4)", display: "flex", alignItems: "center", gap: 8 }}>
              Launch your city <ArrowRight size={18} />
            </button>
            <a href="#" style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", fontSize: 14, fontWeight: 500, textDecoration: "none" }}>
              <ExternalLink size={16} /> See Austin's newsletter
            </a>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 0, justifyContent: "center", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 40 }}>
            {[
              { icon: <Globe size={20} color="#4ade80" />, value: "1+", label: "Cities live" },
              { icon: <Star size={20} color="#4ade80" />, value: "5", label: "Event categories" },
              { icon: <Users size={20} color="#4ade80" />, value: "10+", label: "Data sources" },
            ].map((stat, i) => (
              <div key={i} style={{ flex: 1, padding: "0 32px", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none", textAlign: "center" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>{stat.icon}</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4, fontWeight: 500 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: "80px 32px", background: "#f8fafc" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ display: "inline-block", background: "#dcfce7", color: "#15803d", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>How it works</div>
            <h2 style={{ fontSize: 38, fontWeight: 800, color: "#0f172a", margin: "0 0 12px", fontFamily: "'Georgia', serif" }}>From zero to newsletter in minutes</h2>
            <p style={{ color: "#64748b", fontSize: 16, margin: 0 }}>Four steps to give your city its own events digest.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, position: "relative" }}>
            {/* connecting line */}
            <div style={{ position: "absolute", top: 40, left: "12.5%", right: "12.5%", height: 2, background: "linear-gradient(90deg, #16a34a, #86efac, #16a34a)", borderRadius: 1, zIndex: 0 }} />

            {STEPS.map((step, i) => (
              <div key={i} style={{ position: "relative", zIndex: 1, padding: "0 16px", textAlign: "center" }}>
                {/* number circle */}
                <div style={{
                  width: 80, height: 80, borderRadius: "50%", margin: "0 auto 20px",
                  background: step.comingSoon ? "#f1f5f9" : "linear-gradient(135deg, #16a34a, #22c55e)",
                  border: step.comingSoon ? "2px dashed #cbd5e1" : "none",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  boxShadow: step.comingSoon ? "none" : "0 8px 20px rgba(22,163,74,0.3)",
                  color: step.comingSoon ? "#94a3b8" : "#fff",
                }}>
                  <span style={{ fontSize: 22 }}>{step.icon}</span>
                </div>

                {step.comingSoon && (
                  <span style={{ display: "inline-block", background: "#fef3c7", color: "#b45309", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>Coming soon</span>
                )}

                <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{step.number}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: step.comingSoon ? "#94a3b8" : "#0f172a", margin: "0 0 8px", lineHeight: 1.3 }}>{step.title}</h3>
                <p style={{ fontSize: 13, color: step.comingSoon ? "#cbd5e1" : "#64748b", lineHeight: 1.6, margin: 0 }}>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section style={{ padding: "80px 32px", background: "#fff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ display: "inline-block", background: "#dcfce7", color: "#15803d", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>Categories</div>
            <h2 style={{ fontSize: 38, fontWeight: 800, color: "#0f172a", margin: "0 0 12px", fontFamily: "'Georgia', serif" }}>Five categories, dozens of sources</h2>
            <p style={{ color: "#64748b", fontSize: 16, margin: 0 }}>Pick the categories that define your city. We pull from the top platforms automatically.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {CATEGORIES.map((cat) => (
              <div key={cat.name} style={{ borderRadius: 16, border: `1px solid ${cat.border}30`, background: cat.bg, overflow: "hidden", borderLeft: `4px solid ${cat.border}` }}>
                <div style={{ padding: "24px 24px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>{cat.emoji}</div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", margin: 0 }}>{cat.name}</h3>
                  </div>
                  <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: "0 0 16px" }}>{cat.description}</p>
                </div>
                <div style={{ padding: "12px 24px 20px", borderTop: `1px solid ${cat.border}20`, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {cat.sources.map(s => (
                    <span key={s} style={{ fontSize: 11, fontWeight: 700, background: cat.badge, color: cat.badgeText, padding: "3px 10px", borderRadius: 20 }}>{s}</span>
                  ))}
                </div>
              </div>
            ))}

            {/* Features card */}
            <div style={{ borderRadius: 16, border: "2px dashed #e2e8f0", background: "#f8fafc", padding: 24, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 16px", fontFamily: "'Georgia', serif" }}>And it all just works</h3>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {FEATURES.map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#475569" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Check size={12} color="#16a34a" strokeWidth={3} />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE CITIES */}
      <section style={{ padding: "80px 32px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ display: "inline-block", background: "#dcfce7", color: "#15803d", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>Live cities</div>
            <h2 style={{ fontSize: 38, fontWeight: 800, color: "#0f172a", margin: "0 0 12px", fontFamily: "'Georgia', serif" }}>Live cities</h2>
            <p style={{ color: "#64748b", fontSize: 16, margin: 0 }}>These cities are already sending weekly newsletters. Yours could be next.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {/* Sample city card */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", transition: "box-shadow 0.2s" }}>
              <div style={{ height: 6, background: "linear-gradient(90deg, #16a34a, #22c55e)" }} />
              <div style={{ padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #16a34a, #22c55e)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(22,163,74,0.3)" }}>
                    <span style={{ color: "#fff", fontSize: 20, fontWeight: 800 }}>A</span>
                  </div>
                  <ExternalLink size={16} color="#cbd5e1" />
                </div>
                <div style={{ fontWeight: 700, fontSize: 18, color: "#0f172a", fontFamily: "'Georgia', serif" }}>Raj's Austin Events</div>
                <div style={{ color: "#64748b", fontSize: 14, marginBottom: 16 }}>Austin, TX</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {["Tech", "Arts", "Sports", "Civics", "Wellness"].map(c => (
                    <span key={c} style={{ fontSize: 11, fontWeight: 600, background: "#f1f5f9", color: "#475569", padding: "3px 10px", borderRadius: 20 }}>{c}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* "Your city" placeholder */}
            <div style={{ background: "#fff", borderRadius: 16, border: "2px dashed #d1fae5", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 12, cursor: "pointer", minHeight: 180 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "#f0fdf4", border: "2px dashed #86efac", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MapPin size={22} color="#16a34a" />
              </div>
              <div style={{ fontWeight: 700, color: "#16a34a", fontSize: 16 }}>Your city could be next</div>
              <div style={{ color: "#64748b", fontSize: 13, textAlign: "center" }}>Join the platform and launch in minutes</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)", padding: "96px 32px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "24px 24px", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 640, margin: "0 auto" }}>
          <h2 style={{ fontSize: 48, fontWeight: 800, color: "#fff", margin: "0 0 20px", lineHeight: 1.15, fontFamily: "'Georgia', serif" }}>Ready to launch your city?</h2>
          <p style={{ fontSize: 18, color: "#bbf7d0", margin: "0 0 40px", lineHeight: 1.6 }}>
            Join the platform and give your city the newsletter it deserves. Setup takes under five minutes.
          </p>
          <button style={{ background: "#fff", color: "#16a34a", border: "none", borderRadius: 32, padding: "16px 40px", fontSize: 17, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", display: "inline-flex", alignItems: "center", gap: 10 }}>
            Get started — it's free <ArrowRight size={20} />
          </button>
          <p style={{ color: "#86efac", fontSize: 13, marginTop: 16 }}>No credit card required.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#0f172a", padding: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/__mockup/images/eventcarpooling-logo.png" alt="EventCarpooling" style={{ width: 34, height: 34, objectFit: "contain" }} />
          <span style={{ fontWeight: 700, color: "#fff", fontFamily: "'Georgia', serif" }}>EventCarpooling</span>
        </div>
        <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>© {new Date().getFullYear()} EventCarpooling. Helping cities connect in real life.</p>
      </footer>
    </div>
  );
}
