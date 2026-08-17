export default function MaintenancePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, #d6eaf8 0%, #b8d9f0 60%, #1a3a5c 60%, #1a3a5c 100%)",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Orange accent stripe */}
      <div style={{ position: "absolute", bottom: "40%", left: 0, right: 0, height: "6px", background: "#e8651a", zIndex: 2 }} />

      {/* Sky / content area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "40px 48px 0", position: "relative", zIndex: 3 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "48px" }}>
          <img
            src="/eventcarpooling-logo.png"
            alt="EventCarpooling"
            style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover", boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }}
          />
          <span style={{ fontSize: "22px", fontWeight: "700", color: "#1a3a5c", letterSpacing: "-0.3px" }}>
            EventCarpooling
          </span>
        </div>

        {/* Main content row */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flex: 1 }}>
          {/* Text */}
          <div style={{ maxWidth: "420px", paddingBottom: "60px" }}>
            <p style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "#e8651a" }}>
              🔧 Site Under Maintenance
            </p>
            <h1 style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: "400", color: "#1a3a5c", lineHeight: 1.4, margin: 0 }}>
              We're down for maintenance.<br />
              We'll be back soon!
            </h1>
          </div>

          {/* Illustration: disconnected plug */}
          <div style={{ paddingBottom: "40px", paddingRight: "24px", display: "flex", alignItems: "flex-end" }}>
            <svg width="260" height="220" viewBox="0 0 260 220" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Car body silhouette (teal, like Atlassian mascot) */}
              <ellipse cx="130" cy="170" rx="70" ry="28" fill="#2196a0" opacity="0.18" />
              <rect x="70" y="120" width="120" height="50" rx="14" fill="#2196a0" />
              <path d="M85 120 C90 95 100 85 130 85 C160 85 170 95 175 120 Z" fill="#2196a0" />

              {/* Windshield */}
              <path d="M100 119 C103 100 110 93 130 93 C150 93 157 100 160 119 Z" fill="#b8d9f0" opacity="0.7" />

              {/* Wheels */}
              <circle cx="95" cy="172" r="16" fill="#1a3a5c" />
              <circle cx="95" cy="172" r="8" fill="#4a90c4" />
              <circle cx="165" cy="172" r="16" fill="#1a3a5c" />
              <circle cx="165" cy="172" r="8" fill="#4a90c4" />

              {/* Left plug (going left, disconnected) */}
              <path d="M40 105 Q30 130 55 145" stroke="#e8651a" strokeWidth="6" strokeLinecap="round" fill="none" />
              <rect x="50" y="140" width="22" height="14" rx="4" fill="#e8651a" />
              <rect x="55" y="130" width="4" height="12" rx="2" fill="#e8651a" />
              <rect x="63" y="130" width="4" height="12" rx="2" fill="#e8651a" />

              {/* Right plug (going right, disconnected) */}
              <path d="M220 95 Q230 120 205 140" stroke="#e8651a" strokeWidth="6" strokeLinecap="round" fill="none" />
              <rect x="188" y="136" width="22" height="14" rx="4" fill="#e8651a" />
              <rect x="193" y="126" width="4" height="12" rx="2" fill="#e8651a" />
              <rect x="201" y="126" width="4" height="12" rx="2" fill="#e8651a" />

              {/* Gap between plugs (spark effect) */}
              <line x1="72" y1="147" x2="188" y2="140" stroke="#e8651a" strokeWidth="2" strokeDasharray="6 6" opacity="0.4" />
              <text x="124" y="144" fontSize="18" textAnchor="middle" fill="#e8651a" opacity="0.7">✦</text>

              {/* People in car */}
              <circle cx="115" cy="108" r="8" fill="#1a3a5c" opacity="0.6" />
              <circle cx="145" cy="108" r="8" fill="#1a3a5c" opacity="0.6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Navy bottom area */}
      <div style={{ height: "40%", background: "#1a3a5c", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
        <p style={{ color: "#4a90c4", fontSize: "13px", marginTop: "20px" }}>
          © {new Date().getFullYear()} EventCarpooling
        </p>
      </div>
    </div>
  );
}
