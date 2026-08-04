import { useEffect } from "react";

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

export default function AustinCaresDeals() {
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

      {/* ── NAV ── */}
      <nav style={{ padding: "20px 0" }}>
        <div style={{ maxWidth: 1020, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ ...serif, fontWeight: 600, fontSize: 21, letterSpacing: "-0.01em", color: C.char }}>
            Austin<span style={{ color: C.rust }}>Cares</span>
          </div>
          <a
            href="#business"
            style={{ color: C.char, textDecoration: "none", fontSize: 14.5, fontWeight: 600, border: `1.5px solid ${C.char}`, padding: "9px 16px", borderRadius: 100 }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = C.char; (e.currentTarget as HTMLAnchorElement).style.color = C.paper; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; (e.currentTarget as HTMLAnchorElement).style.color = C.char; }}
          >
            I run a business →
          </a>
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
            <a href="#" style={{ display: "inline-block", textDecoration: "none", fontWeight: 700, fontSize: 15.5, padding: "14px 25px", borderRadius: 12, background: C.rust, color: "#fff", boxShadow: `0 10px 26px rgba(196,80,43,.28)` }}>
              Get this week's deals
            </a>
            <a href="#business" style={{ display: "inline-block", textDecoration: "none", fontWeight: 700, fontSize: 15.5, padding: "14px 25px", borderRadius: 12, background: "transparent", color: C.char, border: `1.5px solid ${C.char}` }}>
              I run a business →
            </a>
          </div>
          {/* Day strip */}
          <div style={{ display: "flex", gap: 8, marginTop: 40, flexWrap: "wrap" as const }}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
              <div
                key={day}
                style={{
                  background: i === 0 ? C.char : C.paper,
                  border: `1px solid ${i === 0 ? C.char : C.line}`,
                  borderRadius: 11,
                  padding: "9px 15px",
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: i === 0 ? C.paper : C.muted,
                }}
              >
                {day}
              </div>
            ))}
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
                { day: "TUE", biz: "Masala Wok — Tikka Tuesday",  off: "Tikka Masala + Rice + Naan + Drink — $11.95", meta: "All-day · dine-in or to-go", dist: "0.4 mi" },
                { day: "WED", biz: "The Fade Room",                off: "Half-price haircuts",                        meta: "Walk-ins, 10am–2pm",         dist: "0.7 mi" },
                { day: "THU", biz: "Rainey Draft House",           off: "$2 off all drafts",                          meta: "4–6pm happy hour",           dist: "1.1 mi" },
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
          </div>
        </div>
      </section>

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
              <div style={{ ...serif, fontSize: 52, fontWeight: 600, color: C.rust }}>
                $5.99<span style={{ fontSize: 17, color: C.muted, fontWeight: 500 }}>/month</span>
              </div>
              <ul style={{ listStyle: "none", textAlign: "left", margin: "24px auto", maxWidth: 240 }}>
                {["List your weekly deal", "Sorted by day & geo-matched to nearby readers", "Update anytime", "Cancel anytime"].map(item => (
                  <li key={item} style={{ fontSize: 14.5, paddingLeft: 22, position: "relative", marginBottom: 9, color: C.brown }}>
                    <span style={{ position: "absolute", left: 0, color: C.olive, fontWeight: 700 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <a href="#" style={{ display: "block", textDecoration: "none", fontWeight: 700, fontSize: 15.5, padding: "14px 25px", borderRadius: 12, background: C.rust, color: "#fff", boxShadow: `0 10px 26px rgba(196,80,43,.28)` }}>
                List your business
              </a>
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
        <div>Part of the EventCarpooling network — what's happening, and what's on sale, near you.</div>
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
