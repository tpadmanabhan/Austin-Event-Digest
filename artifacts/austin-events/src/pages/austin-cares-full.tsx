import { useEffect, useRef } from "react";
import { Link } from "wouter";

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

interface Deal {
  business: string;
  deal: string;
  savings: string;
  source: string;
  location: string;
  url: string;
  day: string;
  lat?: number;
  lng?: number;
}

const DEALS: Deal[] = [
  {
    day: "TUE",
    business: "Masala Wok",
    deal: "Tikka Tuesday — Tikka Masala + Rice + Naan + Drink",
    savings: "$11.95 all-day",
    source: "Direct",
    location: "10515 N Mopac Expy Ste A155, Austin",
    url: "https://www.grubhub.com/restaurant/masala-wok-10515-n-mopac-expy-ste-a155-austin/659613",
    lat: 30.4161,
    lng: -97.7354,
  },
  {
    day: "ANY DAY",
    business: "Schlotzsky's",
    deal: "$25 eGift Card Toward Sandwiches, Salads, Pizzas, Soups & Desserts",
    savings: "Pay $22.62 · Save $2.38",
    source: "Groupon",
    location: "8900 S Congress Ave #200, Austin",
    url: "https://www.groupon.com/deals/schlotzskys-25",
    lat: 30.1762,
    lng: -97.7834,
  },
  {
    day: "ANY DAY",
    business: "McAlister's Deli",
    deal: "$25 eGift Card Toward Sandwiches, Salads, Spuds, Desserts & Drinks",
    savings: "Pay $22.62 · Save $2.38",
    source: "Groupon",
    location: "2525 W Anderson Ln #130, Austin",
    url: "https://www.groupon.com/deals/mcalisters-deli-25",
    lat: 30.3617,
    lng: -97.7307,
  },
  {
    day: "ANY DAY",
    business: "Rasoi Indian Restaurant",
    deal: "$25 Toward Food & Drinks — up to 22% off",
    savings: "From $13.50",
    source: "Groupon",
    location: "9308 Anderson Mill Rd, Austin",
    url: "https://www.groupon.com/deals/rasoi-indian-restaurant-12522599",
    lat: 30.4350,
    lng: -97.7900,
  },
  {
    day: "ANY DAY",
    business: "Electric Gravy Mumbai Bar & Canteen",
    deal: "Indian Cuisine Food & Drinks",
    savings: "From $19",
    source: "Groupon",
    location: "1050 East 11th St, Austin",
    url: "https://www.groupon.com/deals/electric-gravy-mumbai-bar-canteen",
    lat: 30.2693,
    lng: -97.7266,
  },
];

// Group by day label
const grouped = DEALS.reduce<Record<string, Deal[]>>((acc, d) => {
  (acc[d.day] ??= []).push(d);
  return acc;
}, {});

const DAY_ORDER = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN", "ANY DAY", "WEEKLY"];

const sortedDays = Object.keys(grouped).sort(
  (a, b) => (DAY_ORDER.indexOf(a) === -1 ? 99 : DAY_ORDER.indexOf(a)) - (DAY_ORDER.indexOf(b) === -1 ? 99 : DAY_ORDER.indexOf(b))
);

// Current week label
function weekLabel() {
  const today = new Date();
  const day = today.getDay(); // 0 = Sun
  const sun = new Date(today);
  sun.setDate(today.getDate() - day);
  const sat = new Date(sun);
  sat.setDate(sun.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  return `${fmt(sun)} – ${fmt(sat)}, ${sat.getFullYear()}`;
}

const MAPPED_DEALS = DEALS.filter((d) => d.lat != null && d.lng != null);

export default function AustinCaresFullEdition() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  // Deal location map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    let mounted = true;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (!mounted || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [30.35, -97.76],
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

      MAPPED_DEALS.forEach((deal) => {
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

        L.marker([deal.lat!, deal.lng!], { icon })
          .addTo(map)
          .bindTooltip(
            `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-width:160px;">
              <strong style="font-size:13px;display:block;margin-bottom:3px;">${deal.business}</strong>
              <span style="font-size:12px;color:#C4502B;font-weight:600;">${deal.deal}</span><br/>
              <span style="font-size:11px;color:#6B6055;">${deal.location}</span>
            </div>`,
            { direction: "top", offset: [0, -8], opacity: 1 }
          );
      });

      if (MAPPED_DEALS.length > 1) {
        const latlngs = MAPPED_DEALS.map((d) => [d.lat!, d.lng!] as [number, number]);
        map.fitBounds(latlngs, { padding: [60, 60], maxZoom: 13 });
      }
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
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: C.cream, minHeight: "100vh" }}>

      {/* ── NAV ── */}
      <nav style={{ background: C.paper, borderBottom: `1px solid ${C.line}`, padding: "16px 0" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ ...serif, fontWeight: 600, fontSize: 19, letterSpacing: "-0.01em", color: C.char }}>
                  Austin<span style={{ color: C.rust }}>Cares</span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", background: "#FBBF24", borderRadius: 100, padding: "2px 8px", lineHeight: 1 }}>
                  <span style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "#78350F" }}>Beta</span>
                </span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted }}>Daily Deals Nearby</span>
            </div>
          </Link>
          <Link href="/" style={{ textDecoration: "none", fontSize: 13.5, fontWeight: 600, color: C.muted }}>
            ← Back
          </Link>
        </div>
      </nav>

      {/* ── HEADER ── */}
      <div style={{ background: C.char, color: C.cream, padding: "44px 0 40px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: C.gold, marginBottom: 10 }}>
            AustinCares · Full Edition
          </div>
          <h1 style={{ ...serif, fontWeight: 600, fontSize: "clamp(26px, 4vw, 38px)", lineHeight: 1.1, letterSpacing: "-0.015em", color: "#fff", margin: 0 }}>
            This Week's Deals
          </h1>
          <p style={{ marginTop: 10, fontSize: 15, color: "#C9BFAE" }}>
            {weekLabel()}
          </p>
        </div>
      </div>

      {/* ── DEAL MAP ── */}
      {MAPPED_DEALS.length > 0 && (
        <section style={{ background: C.cream, padding: "48px 0 0" }}>
          <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>
            <h2 style={{ ...serif, fontSize: "clamp(20px, 2.8vw, 26px)", fontWeight: 600, color: C.char, marginBottom: 6 }}>
              Where to find this week's deals
            </h2>
            <p style={{ fontSize: 14.5, color: C.muted, marginBottom: 22 }}>
              {MAPPED_DEALS.length} location{MAPPED_DEALS.length !== 1 ? "s" : ""} mapped · hover a pin for details
            </p>
            <div
              ref={mapContainerRef}
              style={{ height: 340, borderRadius: 16, overflow: "hidden", boxShadow: "0 6px 24px rgba(0,0,0,.11)" }}
            />
          </div>
        </section>
      )}

      {/* ── DEAL BLOCKS ── */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px" }}>
        {sortedDays.map((dayLabel) => (
          <div key={dayLabel} style={{ marginBottom: 48 }}>
            {/* Day section header */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <span style={{
                display: "inline-block",
                background: dayLabel === "ANY DAY" ? C.oliveSoft : C.rust,
                color: dayLabel === "ANY DAY" ? C.olive : "#fff",
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
                padding: "5px 13px",
                borderRadius: 8,
              }}>
                {dayLabel}
              </span>
              <div style={{ flex: 1, height: 1, background: C.line }} />
            </div>

            {/* Deal blocks */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {grouped[dayLabel].map((deal) => (
                <a
                  key={deal.business}
                  href={deal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      background: C.paper,
                      border: `1.5px solid ${C.line}`,
                      borderRadius: 16,
                      padding: "22px 24px",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 20,
                      transition: "border-color 0.15s, box-shadow 0.15s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = C.rust;
                      (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px rgba(196,80,43,.12)`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = C.line;
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      {/* Business name */}
                      <div style={{ fontWeight: 700, fontSize: 17, color: C.char, marginBottom: 5 }}>
                        {deal.business}
                      </div>
                      {/* Deal description */}
                      <div style={{ fontWeight: 600, fontSize: 15, color: C.rust, marginBottom: 8 }}>
                        {deal.deal}
                      </div>
                      {/* Meta row */}
                      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 10, alignItems: "center" }}>
                        <span style={{ fontSize: 13, color: C.muted }}>📍 {deal.location}</span>
                        <span style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          background: "#F0FDF4",
                          color: "#15803D",
                          border: "1px solid #BBF7D0",
                          borderRadius: 6,
                          padding: "2px 8px",
                        }}>
                          {deal.savings}
                        </span>
                        <span style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          background: "#FEF9C3",
                          color: "#92400E",
                          border: "1px solid #FDE68A",
                          borderRadius: 6,
                          padding: "2px 8px",
                          textDecoration: "underline",
                          textDecorationColor: "#D97706",
                          cursor: "pointer",
                        }}>
                          via {deal.source} ↗
                        </span>
                      </div>
                    </div>
                    {/* CTA */}
                    <div style={{
                      flexShrink: 0,
                      alignSelf: "center",
                      background: C.rust,
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 13.5,
                      padding: "10px 18px",
                      borderRadius: 10,
                      whiteSpace: "nowrap" as const,
                    }}>
                      Claim deal →
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}

        {/* Empty state if no deals */}
        {sortedDays.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
            No deals this week yet — check back Sunday.
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div style={{ background: C.char, color: C.cream, padding: "40px 24px", textAlign: "center" }}>
        <div style={{ ...serif, fontSize: 22, fontWeight: 600, color: "#fff", marginBottom: 8 }}>
          Austin<span style={{ color: C.gold }}>Cares</span>
        </div>
        <p style={{ fontSize: 14, color: "#C9BFAE", marginBottom: 20 }}>
          Deals sourced weekly. More coming every Sunday.
        </p>
        <a
          href="/"
          style={{ display: "inline-block", textDecoration: "none", fontWeight: 700, fontSize: 14, padding: "12px 24px", borderRadius: 10, background: C.rust, color: "#fff" }}
        >
          ← Back to AustinCares
        </a>
      </div>
    </div>
  );
}
