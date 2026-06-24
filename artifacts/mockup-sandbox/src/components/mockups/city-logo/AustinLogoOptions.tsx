export function AustinLogoOptions() {
  const accent = "#16a34a";

  const options = [
    {
      label: "Current",
      sub: "First initial",
      content: (
        <div
          style={{
            width: 80, height: 80, borderRadius: 18,
            background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 32, fontWeight: 700, fontFamily: "Georgia, serif",
            boxShadow: "0 6px 20px rgba(22,163,74,0.35)",
          }}
        >
          R
        </div>
      ),
    },
    {
      label: "Option A",
      sub: "Guitar — Live Music Capital",
      highlight: true,
      content: (
        <div
          style={{
            width: 80, height: 80, borderRadius: 18,
            background: `linear-gradient(135deg, #1e1b4b, #312e81)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 42,
            boxShadow: "0 6px 20px rgba(49,46,129,0.45)",
          }}
        >
          🎸
        </div>
      ),
    },
    {
      label: "Option B",
      sub: "Bat + Music (Austin icons)",
      content: (
        <div
          style={{
            width: 80, height: 80, borderRadius: 18,
            background: "linear-gradient(160deg, #0c0a09, #1c1917)",
            display: "flex", flexDirection: "column" as const,
            alignItems: "center", justifyContent: "center", gap: 2,
            boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
          }}
        >
          <span style={{ fontSize: 26, lineHeight: 1 }}>🦇</span>
          <span style={{ fontSize: 18, lineHeight: 1 }}>🎵</span>
        </div>
      ),
    },
    {
      label: "Option C",
      sub: "Lone Star + Guitar",
      content: (
        <div
          style={{
            width: 80, height: 80, borderRadius: 18,
            background: "linear-gradient(135deg, #b45309, #d97706)",
            display: "flex", flexDirection: "column" as const,
            alignItems: "center", justifyContent: "center", gap: 1,
            boxShadow: "0 6px 20px rgba(180,83,9,0.45)",
          }}
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>⭐</span>
          <span style={{ fontSize: 20, lineHeight: 1 }}>🎸</span>
        </div>
      ),
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh", background: "#f1f5f9",
        display: "flex", flexDirection: "column" as const,
        alignItems: "center", justifyContent: "center",
        padding: "40px 24px", fontFamily: "system-ui, sans-serif",
        gap: 32,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#64748b", marginBottom: 8 }}>
          Austin City Card — Logo Draft
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>
          Pick an avatar style for the Austin city card
        </h1>
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" as const, justifyContent: "center" }}>
        {options.map((opt) => (
          <div
            key={opt.label}
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: "28px 24px",
              display: "flex", flexDirection: "column" as const,
              alignItems: "center", gap: 16,
              width: 160,
              boxShadow: opt.highlight
                ? "0 0 0 2.5px #16a34a, 0 8px 24px rgba(22,163,74,0.18)"
                : "0 2px 12px rgba(0,0,0,0.07)",
              position: "relative" as const,
            }}
          >
            {opt.highlight && (
              <div style={{
                position: "absolute" as const, top: -11, left: "50%", transform: "translateX(-50%)",
                background: "#16a34a", color: "#fff", fontSize: 10, fontWeight: 700,
                padding: "3px 10px", borderRadius: 20, letterSpacing: "0.06em",
                textTransform: "uppercase" as const, whiteSpace: "nowrap" as const,
              }}>
                Recommended
              </div>
            )}
            {opt.content}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{opt.label}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{opt.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview in context: how it looks on the actual card */}
      <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", width: 280, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
        <div style={{ height: 6, background: `linear-gradient(90deg, ${accent}, ${accent}99)` }} />
        <div style={{ padding: 20, display: "flex", flexDirection: "column" as const, gap: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{
              width: 80, height: 80, borderRadius: 18,
              background: "linear-gradient(135deg, #1e1b4b, #312e81)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 42, boxShadow: "0 6px 20px rgba(49,46,129,0.45)",
            }}>
              🎸
            </div>
            <div style={{ color: "#cbd5e1", fontSize: 12 }}>↗</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", fontFamily: "Georgia, serif" }}>Raj's Austin Events</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>Austin, TX</div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
            {["Tech", "Music", "Food", "Wellness"].map(c => (
              <span key={c} style={{ fontSize: 11, fontWeight: 600, background: "#f1f5f9", color: "#475569", padding: "3px 10px", borderRadius: 20 }}>{c}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
        Option A shown in context above · Let Raj know which one to apply
      </div>
    </div>
  );
}
