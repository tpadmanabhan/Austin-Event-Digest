import { useEffect, useRef, useState, useCallback } from "react";
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
  teal:     "#0D6E6E",
  tealSoft: "#E0F2F2",
};

const serif: React.CSSProperties = { fontFamily: "'Fraunces', Georgia, serif" };

interface Deal {
  id?: number;
  business: string;
  deal: string;
  savings: string;
  source: string;
  location: string;
  url?: string;
  day: string;
  lat?: number;
  lng?: number;
  imageUrl?: string;
  isSubmitted?: boolean;
}

const STATIC_DEALS: Deal[] = [
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
    day: "TUE",
    business: "Sangam Chettinad",
    deal: "Authentic Chettinad cuisine — weekly specials",
    savings: "See location for details",
    source: "Community",
    location: "2800 E Palm Valley Blvd, Ste 180, Round Rock",
    imageUrl: "/api/storage/objects/uploads/b64e3d00-cac3-40fa-a9a5-f176bffdec92",
    lat: 30.527349,
    lng: -97.6267319,
    isSubmitted: true,
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

const DAY_ORDER = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN", "ANY DAY", "WEEKLY"];

function weekLabel() {
  const today = new Date();
  const day = today.getDay();
  const sun = new Date(today);
  sun.setDate(today.getDate() - day);
  const sat = new Date(sun);
  sat.setDate(sun.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  return `${fmt(sun)} – ${fmt(sat)}, ${sat.getFullYear()}`;
}

// ── Deal Card ─────────────────────────────────────────────────────────────────
function DealCard({ deal }: { deal: Deal }) {
  const [hovered, setHovered] = useState(false);
  const inner = (
    <div
      style={{
        background: C.paper,
        border: `1.5px solid ${hovered ? C.rust : C.line}`,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: hovered ? `0 4px 20px rgba(196,80,43,.12)` : "none",
        transition: "border-color 0.15s, box-shadow 0.15s",
        cursor: deal.url ? "pointer" : "default",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Photo (community submissions only) — full image, no cropping */}
      {deal.imageUrl && (
        <div style={{ width: "100%", background: C.line, lineHeight: 0 }}>
          <img
            src={deal.imageUrl}
            alt={deal.business}
            style={{ width: "100%", display: "block" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}
      <div style={{ padding: "22px 24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 17, color: C.char, marginBottom: 5 }}>
            {deal.business}
          </div>
          <div style={{ fontWeight: 600, fontSize: 15, color: C.rust, marginBottom: 8 }}>
            {deal.deal}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: C.muted }}>📍 {deal.location}</span>
            {deal.savings && (
              <span style={{
                fontSize: 11.5, fontWeight: 700,
                background: "#F0FDF4", color: "#15803D",
                border: "1px solid #BBF7D0", borderRadius: 6, padding: "2px 8px",
              }}>
                {deal.savings}
              </span>
            )}
            {deal.isSubmitted ? (
              <span style={{
                fontSize: 11.5, fontWeight: 700,
                background: C.tealSoft, color: C.teal,
                border: `1px solid ${C.teal}33`, borderRadius: 6, padding: "2px 8px",
              }}>
                🌱 Community
              </span>
            ) : (
              <span style={{
                fontSize: 11.5, fontWeight: 600,
                background: "#FEF9C3", color: "#92400E",
                border: "1px solid #FDE68A", borderRadius: 6, padding: "2px 8px",
                textDecoration: "underline", textDecorationColor: "#D97706", cursor: "pointer",
              }}>
                via {deal.source} ↗
              </span>
            )}
          </div>
        </div>
        {deal.url && (
          <div style={{
            flexShrink: 0, alignSelf: "center",
            background: C.rust, color: "#fff",
            fontWeight: 700, fontSize: 13.5,
            padding: "10px 18px", borderRadius: 10,
            whiteSpace: "nowrap" as const,
          }}>
            Claim deal →
          </div>
        )}
      </div>
    </div>
  );

  if (deal.url) {
    return (
      <a href={deal.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
        {inner}
      </a>
    );
  }
  return inner;
}

// ── Submission Form ────────────────────────────────────────────────────────────
interface FormState {
  firstName: string;
  email: string;
  locationName: string;
  locationAddress: string;
  file: File | null;
  previewUrl: string | null;
}

type SubmitStatus = "idle" | "uploading" | "analyzing" | "done" | "error";

function DealSubmissionForm({ onDealAdded }: { onDealAdded: (deal: Deal) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>({
    firstName: "", email: "", locationName: "", locationAddress: "",
    file: null, previewUrl: null,
  });
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    const url = URL.createObjectURL(file);
    setForm(f => ({ ...f, file, previewUrl: url }));
  }, []);

  const handleChange = useCallback((field: keyof FormState, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.file) { setErrorMsg("Please upload a photo of the deal."); return; }
    if (!form.firstName || !form.email || !form.locationName || !form.locationAddress) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    setStatus("uploading");
    setErrorMsg("");

    try {
      // Step 1 — Get presigned upload URL
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.file.name, size: form.file.size, contentType: form.file.type }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();

      // Step 2 — PUT file directly to GCS
      const putRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": form.file.type },
        body: form.file,
      });
      if (!putRes.ok) throw new Error("Failed to upload photo");

      setStatus("analyzing");

      // Step 3 — Submit deal metadata + objectPath to API
      const submitRes = await fetch("/api/deals/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          email: form.email,
          locationName: form.locationName,
          locationAddress: form.locationAddress,
          objectPath,
        }),
      });
      if (!submitRes.ok) {
        const body = await submitRes.json().catch(() => ({}));
        throw new Error((body as any).message || "Submission failed");
      }
      const { deal } = await submitRes.json();

      // Map API response → Deal interface
      const newDeal: Deal = {
        id: deal.id,
        business: deal.business,
        deal: deal.deal,
        savings: deal.savings,
        day: deal.day,
        source: "Community",
        location: deal.locationAddress,
        imageUrl: deal.imageUrl,
        isSubmitted: true,
      };

      onDealAdded(newDeal);
      setStatus("done");
      setForm({ firstName: "", email: "", locationName: "", locationAddress: "", file: null, previewUrl: null });
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err?.message || "Something went wrong. Please try again.");
    }
  }, [form, onDealAdded]);

  const isLoading = status === "uploading" || status === "analyzing";
  const statusLabel = status === "uploading" ? "Uploading photo…" : status === "analyzing" ? "Analyzing deal with AI…" : "";

  return (
    <div style={{ marginTop: 56, marginBottom: 8 }}>
      {!open ? (
        <div style={{ textAlign: "center" }}>
          <button
            onClick={() => setOpen(true)}
            style={{
              background: "transparent",
              border: `2px dashed ${C.rust}`,
              borderRadius: 14,
              padding: "18px 36px",
              cursor: "pointer",
              color: C.rust,
              fontWeight: 700,
              fontSize: 15,
              fontFamily: "'Inter', system-ui, sans-serif",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#FEF2EC")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <span style={{ fontSize: 20 }}>🏷️</span>
            Want to add a deal?
          </button>
          <p style={{ marginTop: 10, fontSize: 13, color: C.muted }}>
            Know a local deal we're missing? Share it with the community.
          </p>
        </div>
      ) : (
        <div style={{
          background: C.paper,
          border: `1.5px solid ${C.line}`,
          borderRadius: 20,
          padding: "32px 32px 28px",
          boxShadow: "0 4px 24px rgba(0,0,0,.07)",
        }}>
          {/* Form header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div>
              <div style={{ ...serif, fontSize: 20, fontWeight: 600, color: C.char }}>
                Submit a community deal
              </div>
              <p style={{ fontSize: 13.5, color: C.muted, marginTop: 4 }}>
                Your name and email stay private — only the deal is shown publicly.
              </p>
            </div>
            <button
              onClick={() => { setOpen(false); setStatus("idle"); setErrorMsg(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 22, lineHeight: 1, padding: "0 0 0 12px" }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {status === "done" ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
              <div style={{ fontWeight: 700, fontSize: 17, color: C.char, marginBottom: 6 }}>Deal added!</div>
              <p style={{ fontSize: 14, color: C.muted, marginBottom: 20 }}>
                Your deal is now live in the directory below.
              </p>
              <button
                onClick={() => { setOpen(false); setStatus("idle"); }}
                style={{ background: C.rust, color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif" }}
              >
                Add another deal
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px" }}>
                {/* First name */}
                <div>
                  <label style={labelStyle}>First name</label>
                  <input
                    type="text"
                    placeholder="Jane"
                    value={form.firstName}
                    onChange={e => handleChange("firstName", e.target.value)}
                    required
                    style={inputStyle}
                    disabled={isLoading}
                  />
                </div>
                {/* Email */}
                <div>
                  <label style={labelStyle}>Email address</label>
                  <input
                    type="email"
                    placeholder="jane@example.com"
                    value={form.email}
                    onChange={e => handleChange("email", e.target.value)}
                    required
                    style={inputStyle}
                    disabled={isLoading}
                  />
                </div>
                {/* Location name */}
                <div>
                  <label style={labelStyle}>Deal location name</label>
                  <input
                    type="text"
                    placeholder="Masala Wok"
                    value={form.locationName}
                    onChange={e => handleChange("locationName", e.target.value)}
                    required
                    style={inputStyle}
                    disabled={isLoading}
                  />
                </div>
                {/* Address */}
                <div>
                  <label style={labelStyle}>Location address</label>
                  <input
                    type="text"
                    placeholder="123 Main St, Austin, TX"
                    value={form.locationAddress}
                    onChange={e => handleChange("locationAddress", e.target.value)}
                    required
                    style={inputStyle}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Photo upload */}
              <div style={{ marginTop: 20 }}>
                <label style={labelStyle}>Upload a picture of the deal</label>
                <div
                  style={{
                    marginTop: 6,
                    border: `2px dashed ${form.previewUrl ? C.rust : C.line}`,
                    borderRadius: 12,
                    padding: form.previewUrl ? 0 : "28px 20px",
                    textAlign: "center",
                    cursor: "pointer",
                    overflow: "hidden",
                    transition: "border-color 0.15s",
                    background: form.previewUrl ? C.line : "#FFFAF5",
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {form.previewUrl ? (
                    <div style={{ position: "relative" }}>
                      <img
                        src={form.previewUrl}
                        alt="Deal preview"
                        style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }}
                      />
                      <div style={{
                        position: "absolute", bottom: 10, right: 10,
                        background: "rgba(0,0,0,0.6)", color: "#fff",
                        fontSize: 12, fontWeight: 600, borderRadius: 6, padding: "4px 10px",
                        cursor: "pointer",
                      }}>
                        Change photo
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
                      <div style={{ fontWeight: 600, color: C.char, fontSize: 14, marginBottom: 4 }}>
                        Click to upload a photo
                      </div>
                      <div style={{ fontSize: 12, color: C.muted }}>
                        JPG, PNG, WEBP, GIF, HEIC accepted
                      </div>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                  disabled={isLoading}
                />
              </div>

              {/* Error */}
              {errorMsg && (
                <div style={{
                  marginTop: 14, padding: "10px 14px", borderRadius: 8,
                  background: "#FEF2F2", border: "1px solid #FECACA",
                  color: "#B91C1C", fontSize: 13.5, fontWeight: 500,
                }}>
                  {errorMsg}
                </div>
              )}

              {/* Submit */}
              <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 16 }}>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    background: isLoading ? "#B0A090" : C.rust,
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "12px 28px",
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: isLoading ? "not-allowed" : "pointer",
                    fontFamily: "'Inter', system-ui, sans-serif",
                    transition: "background 0.15s",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {isLoading && (
                    <span style={{
                      width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)",
                      borderTopColor: "#fff", borderRadius: "50%",
                      display: "inline-block",
                      animation: "spin 0.8s linear infinite",
                    }} />
                  )}
                  {isLoading ? statusLabel : "Submit deal"}
                </button>
                {!isLoading && (
                  <button
                    type="button"
                    onClick={() => { setOpen(false); setStatus("idle"); setErrorMsg(""); }}
                    style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, fontFamily: "'Inter', system-ui, sans-serif" }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12.5,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  color: "#6B6055",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1.5px solid #EDE1CF",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 14,
  fontFamily: "'Inter', system-ui, sans-serif",
  color: "#241C15",
  background: "#FFFAF5",
  outline: "none",
};

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AustinCaresFullEdition() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const [submittedDeals, setSubmittedDeals] = useState<Deal[]>([]);

  // Fetch community-submitted deals on mount
  useEffect(() => {
    fetch("/api/deals/submitted")
      .then(r => r.json())
      .then(data => {
        const deals: Deal[] = (data.deals ?? []).map((d: any) => ({
          id: d.id,
          business: d.business,
          deal: d.deal,
          savings: d.savings,
          day: d.day,
          source: "Community",
          location: d.locationAddress,
          imageUrl: d.imageUrl,
          lat: d.lat ?? undefined,
          lng: d.lng ?? undefined,
          isSubmitted: true,
        }));
        setSubmittedDeals(deals);
      })
      .catch(() => {}); // non-fatal
  }, []);

  const handleDealAdded = useCallback((deal: Deal) => {
    setSubmittedDeals(prev => [...prev, deal]);
  }, []);

  // Merge static + submitted deals; static wins when business names match (curated position/day takes priority)
  const staticNames = new Set(STATIC_DEALS.map(d => d.business.toLowerCase().trim()));
  const allDeals = [
    ...STATIC_DEALS,
    ...submittedDeals.filter(d => !staticNames.has(d.business.toLowerCase().trim())),
  ];

  const grouped = allDeals.reduce<Record<string, Deal[]>>((acc, d) => {
    (acc[d.day] ??= []).push(d);
    return acc;
  }, {});

  const sortedDays = Object.keys(grouped).sort(
    (a, b) =>
      (DAY_ORDER.indexOf(a) === -1 ? 99 : DAY_ORDER.indexOf(a)) -
      (DAY_ORDER.indexOf(b) === -1 ? 99 : DAY_ORDER.indexOf(b))
  );

  const mappedDeals = allDeals.filter(d => d.lat != null && d.lng != null);

  // Map
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

      mappedDeals.forEach(deal => {
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:30px;height:30px;border-radius:50%;background:#C4502B;border:2.5px solid #F4B49A;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1;">📍</div>`,
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

      if (mappedDeals.length > 1) {
        const latlngs = mappedDeals.map(d => [d.lat!, d.lng!] as [number, number]);
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

  // Google Fonts
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
          <p style={{ marginTop: 6, fontSize: 14, color: "#C9BFAE" }}>
            Add your deals, too!
          </p>
        </div>
      </div>

      {/* ── DEAL MAP ── */}
      {mappedDeals.length > 0 && (
        <section style={{ background: C.cream, padding: "48px 0 0" }}>
          <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>
            <h2 style={{ ...serif, fontSize: "clamp(20px, 2.8vw, 26px)", fontWeight: 600, color: C.char, marginBottom: 6 }}>
              Where to find this week's deals
            </h2>
            <p style={{ fontSize: 14.5, color: C.muted, marginBottom: 22 }}>
              {mappedDeals.length} location{mappedDeals.length !== 1 ? "s" : ""} mapped · hover a pin for details
            </p>
            <div
              ref={mapContainerRef}
              style={{ height: 340, borderRadius: 16, overflow: "hidden", boxShadow: "0 6px 24px rgba(0,0,0,.11)" }}
            />
          </div>
        </section>
      )}

      {/* ── DEAL BLOCKS ── */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 0" }}>
        {sortedDays.map(dayLabel => (
          <div key={dayLabel} style={{ marginBottom: 48 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <span style={{
                display: "inline-block",
                background: dayLabel === "ANY DAY" ? C.oliveSoft : C.rust,
                color: dayLabel === "ANY DAY" ? C.olive : "#fff",
                fontWeight: 800, fontSize: 11, letterSpacing: "0.13em",
                textTransform: "uppercase", padding: "5px 13px", borderRadius: 8,
              }}>
                {dayLabel}
              </span>
              <div style={{ flex: 1, height: 1, background: C.line }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {grouped[dayLabel].map((deal, i) => (
                <DealCard key={deal.id ?? `${deal.business}-${i}`} deal={deal} />
              ))}
            </div>
          </div>
        ))}

        {sortedDays.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
            No deals this week yet — check back Sunday.
          </div>
        )}

        {/* ── SUBMIT FORM ── */}
        <DealSubmissionForm onDealAdded={handleDealAdded} />
      </div>

      {/* ── FOOTER ── */}
      <div style={{ background: C.char, color: C.cream, padding: "40px 24px", textAlign: "center", marginTop: 80 }}>
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
