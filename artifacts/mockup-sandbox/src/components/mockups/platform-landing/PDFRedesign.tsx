const PERSONAS = [
  { label: "NEW IN TOWN", emoji: "📦" },
  { label: "NO LONGER DRIVES", emoji: "🚌" },
  { label: "SOCCER SEASON", emoji: "⚽" },
  { label: "SKIPPING SURGE", emoji: "💸" },
];

const VALUES = [
  {
    headline: "Less Uber, more neighbor",
    body: "Skip surge pricing. Share the ride, split the cost, keep the money in your neighborhood.",
    accent: "#15803d",
    bg: "#f0fdf4",
  },
  {
    headline: "A cure for lonely cities",
    body: "Half of us feel alone. Every shared ride is a conversation, a connection, a neighbor you now know.",
    accent: "#1d4ed8",
    bg: "#eff6ff",
  },
  {
    headline: "Technology in service of real life",
    body: "We use AI to put people in the same car — not to replace them. Helping humans, not automating them away.",
    accent: "#7c3aed",
    bg: "#faf5ff",
  },
];

const STEPS = [
  {
    icon: "📬",
    title: "Get the digest",
    body: "The best local events in your inbox, every week.",
  },
  {
    icon: "🙋",
    title: "RSVP to ride",
    body: "See who's going from your neighborhood.",
  },
  {
    icon: "🚗",
    title: "Go together",
    body: "Share the ride there. Come home with a new friend.",
  },
];

export function PDFRedesign() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#fff", minHeight: "100vh", color: "#111" }}>

      {/* NAV */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #e5e7eb",
        padding: "0 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between", height: 60,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/__mockup/images/eventcarpooling-logo.png" alt="EventCarpooling" style={{ width: 44, height: 44, objectFit: "contain" }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: "#111", letterSpacing: "-0.02em" }}>event carpooling</span>
          <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 700, background: "#fef3c7", color: "#b45309", padding: "2px 8px", borderRadius: 20, letterSpacing: "0.06em", textTransform: "uppercase", border: "1px solid #fde68a" }}>Beta</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", letterSpacing: "0.1em", textTransform: "uppercase" }}>LESS UBER · MORE NEIGHBOR</span>
          <button style={{ background: "#111", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Start your city
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        background: "linear-gradient(175deg, #fff 0%, #f0fdf4 50%, #dcfce7 100%)",
        padding: "100px 40px 80px",
        textAlign: "center",
        borderBottom: "1px solid #d1fae5",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#15803d", marginBottom: 24 }}>
            LESS UBER · MORE NEIGHBOR
          </div>

          <h1 style={{
            fontSize: "clamp(36px, 5vw, 68px)",
            fontWeight: 800,
            color: "#0f172a",
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            margin: "0 0 24px",
            fontFamily: "'Georgia', serif",
          }}>
            AI that brings<br />
            <span style={{ color: "#15803d" }}>people together.</span>
          </h1>

          <p style={{ fontSize: 18, color: "#475569", lineHeight: 1.7, margin: "0 0 48px", maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
            A weekly digest of your city's best events — and neighbors to ride there with.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button style={{
              background: "#15803d", color: "#fff", border: "none",
              borderRadius: 10, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 4px 16px rgba(21,128,61,0.35)",
            }}>
              Get your city's digest
            </button>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <button style={{
                background: "#fff", color: "#0f172a",
                border: "2px solid #e5e7eb",
                borderRadius: 10, padding: "14px 28px", fontSize: 15, fontWeight: 600, cursor: "pointer",
              }}>
                Launch a city →
              </button>
              <a href="https://austin.eventcarpooling.com" target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, color: "#15803d", fontWeight: 600, textDecoration: "none", letterSpacing: "0.01em" }}>
                ↗ See Austin's digest
              </a>
            </div>
          </div>
        </div>

        {/* PERSONA CHIPS */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 64 }}>
          {PERSONAS.map((p) => (
            <div key={p.label} style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#fff", border: "1px solid #e5e7eb",
              borderRadius: 40, padding: "10px 20px",
              boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            }}>
              <span style={{ fontSize: 18 }}>{p.emoji}</span>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#374151", textTransform: "uppercase" }}>{p.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* VALUE PROPS */}
      <section style={{ padding: "80px 40px", background: "#fff" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", gap: 0 }}>
          {VALUES.map((v, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "1fr 1fr",
              borderBottom: "1px solid #f1f5f9",
              padding: "56px 0",
            }}>
              <div style={{ paddingRight: 40, display: "flex", alignItems: "center" }}>
                <h2 style={{
                  fontSize: "clamp(22px, 2.5vw, 36px)",
                  fontWeight: 800, color: "#0f172a",
                  margin: 0, lineHeight: 1.15,
                  fontFamily: "'Georgia', serif",
                  letterSpacing: "-0.02em",
                }}>
                  {v.headline}
                </h2>
              </div>
              <div style={{
                background: v.bg, borderRadius: 16, padding: "28px 32px",
                borderLeft: `4px solid ${v.accent}`,
              }}>
                <p style={{ fontSize: 17, color: "#374151", lineHeight: 1.7, margin: 0 }}>{v.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: "80px 40px", background: "#f8fafc", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{
            textAlign: "center", fontSize: 36, fontWeight: 800,
            color: "#0f172a", margin: "0 0 64px",
            fontFamily: "'Georgia', serif", letterSpacing: "-0.02em",
          }}>
            How it works
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{
                  width: 72, height: 72, borderRadius: "50%",
                  background: "#fff", border: "2px solid #d1fae5",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 20px",
                  boxShadow: "0 4px 16px rgba(21,128,61,0.1)",
                  fontSize: 28,
                }}>
                  {s.icon}
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
                  color: "#15803d", textTransform: "uppercase", marginBottom: 10,
                }}>
                  Step {i + 1}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6, margin: 0 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section style={{
        background: "#0f172a",
        padding: "96px 40px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(34,197,94,0.06) 1px, transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 600, margin: "0 auto" }}>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", color: "#4ade80", textTransform: "uppercase", marginBottom: 24 }}>
            Rides shared. Neighbors found. Nobody left behind.
          </p>
          <h2 style={{
            fontSize: "clamp(28px, 4vw, 52px)",
            fontWeight: 800, color: "#fff",
            fontFamily: "'Georgia', serif",
            margin: "0 0 16px", lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}>
            A more perfect union starts<br />with a shared ride.
          </h2>
          <p style={{ fontSize: 16, color: "#94a3b8", margin: "0 0 40px", lineHeight: 1.6 }}>
            Join your city's digest
          </p>
          <button style={{
            background: "#15803d", color: "#fff", border: "none",
            borderRadius: 10, padding: "16px 36px",
            fontSize: 16, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 8px 32px rgba(21,128,61,0.4)",
          }}>
            Join your city's digest
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#020617", padding: "24px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/__mockup/images/eventcarpooling-logo.png" alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>event carpooling</span>
        </div>
        <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>© 2026 EventCarpooling · Community-owned, neighbor-driven</p>
      </footer>

    </div>
  );
}
