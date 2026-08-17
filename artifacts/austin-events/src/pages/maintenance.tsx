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
      <style>{`
        @keyframes robotBounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes leftArmSwing {
          0%, 100% { transform: rotate(-20deg); }
          50% { transform: rotate(40deg); }
        }
        @keyframes rightArmSwing {
          0%, 100% { transform: rotate(20deg); }
          50% { transform: rotate(-40deg); }
        }
        @keyframes leftLegSwing {
          0%, 100% { transform: rotate(15deg); }
          50% { transform: rotate(-15deg); }
        }
        @keyframes rightLegSwing {
          0%, 100% { transform: rotate(-15deg); }
          50% { transform: rotate(15deg); }
        }
        @keyframes eyeBlink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        @keyframes antennaWiggle {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(8deg); }
        }
        @keyframes robotSway {
          0%, 100% { transform: rotate(-3deg) translateY(0px); }
          50% { transform: rotate(3deg) translateY(-12px); }
        }
        @keyframes headBob {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        @keyframes shadowPulse {
          0%, 100% { transform: scaleX(1); opacity: 0.2; }
          50% { transform: scaleX(0.7); opacity: 0.1; }
        }
        @keyframes eyeGlow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

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

          {/* Dancing Robot */}
          <div style={{ paddingBottom: "50px", paddingRight: "48px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* Robot container with overall sway */}
            <div style={{
              position: "relative",
              width: "140px",
              height: "220px",
              animation: "robotBounce 0.8s ease-in-out infinite",
            }}>

              {/* Antenna */}
              <div style={{
                position: "absolute",
                top: "-28px",
                left: "50%",
                transform: "translateX(-50%)",
                transformOrigin: "bottom center",
                animation: "antennaWiggle 0.8s ease-in-out infinite",
              }}>
                <div style={{ width: "4px", height: "22px", background: "#1a3a5c", margin: "0 auto" }} />
                <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#e8651a", margin: "0 auto", boxShadow: "0 0 8px #e8651a" }} />
              </div>

              {/* Head */}
              <div style={{
                position: "absolute",
                top: "0",
                left: "50%",
                transform: "translateX(-50%)",
                transformOrigin: "center bottom",
                animation: "headBob 0.8s ease-in-out infinite",
              }}>
                <div style={{
                  width: "80px",
                  height: "64px",
                  background: "#2196a0",
                  borderRadius: "12px",
                  border: "3px solid #1a3a5c",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                }}>
                  {/* Eyes */}
                  <div style={{
                    width: "16px", height: "16px", borderRadius: "50%",
                    background: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    animation: "eyeBlink 3s ease-in-out infinite",
                    transformOrigin: "center",
                  }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#e8651a", animation: "eyeGlow 1.6s ease-in-out infinite" }} />
                  </div>
                  <div style={{
                    width: "16px", height: "16px", borderRadius: "50%",
                    background: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    animation: "eyeBlink 3s ease-in-out infinite 0.1s",
                    transformOrigin: "center",
                  }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#e8651a", animation: "eyeGlow 1.6s ease-in-out infinite 0.2s" }} />
                  </div>
                  {/* Mouth */}
                  <div style={{
                    position: "absolute",
                    bottom: "12px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "32px",
                    height: "6px",
                    background: "#1a3a5c",
                    borderRadius: "3px",
                  }} />
                </div>
              </div>

              {/* Body */}
              <div style={{
                position: "absolute",
                top: "70px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "90px",
                height: "80px",
                background: "#1a3a5c",
                borderRadius: "10px",
                border: "3px solid #0d2540",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {/* Chest panel */}
                <div style={{
                  width: "50px", height: "40px",
                  background: "#4a90c4",
                  borderRadius: "6px",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: "5px",
                }}>
                  <div style={{ width: "24px", height: "6px", background: "#e8651a", borderRadius: "3px" }} />
                  <div style={{ display: "flex", gap: "5px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2196a0", animation: "eyeGlow 1s ease-in-out infinite" }} />
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2196a0", animation: "eyeGlow 1s ease-in-out infinite 0.3s" }} />
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2196a0", animation: "eyeGlow 1s ease-in-out infinite 0.6s" }} />
                  </div>
                </div>
              </div>

              {/* Left Arm */}
              <div style={{
                position: "absolute",
                top: "76px",
                left: "2px",
                width: "20px",
                height: "60px",
                background: "#2196a0",
                borderRadius: "10px",
                border: "2px solid #1a3a5c",
                transformOrigin: "top center",
                animation: "leftArmSwing 0.8s ease-in-out infinite",
              }} />

              {/* Right Arm */}
              <div style={{
                position: "absolute",
                top: "76px",
                right: "2px",
                width: "20px",
                height: "60px",
                background: "#2196a0",
                borderRadius: "10px",
                border: "2px solid #1a3a5c",
                transformOrigin: "top center",
                animation: "rightArmSwing 0.8s ease-in-out infinite",
              }} />

              {/* Left Leg */}
              <div style={{
                position: "absolute",
                top: "153px",
                left: "22px",
                width: "22px",
                height: "58px",
                background: "#1a3a5c",
                borderRadius: "0 0 8px 8px",
                transformOrigin: "top center",
                animation: "leftLegSwing 0.8s ease-in-out infinite",
              }}>
                {/* Left foot */}
                <div style={{ position: "absolute", bottom: 0, left: "-4px", width: "30px", height: "12px", background: "#e8651a", borderRadius: "6px" }} />
              </div>

              {/* Right Leg */}
              <div style={{
                position: "absolute",
                top: "153px",
                right: "22px",
                width: "22px",
                height: "58px",
                background: "#1a3a5c",
                borderRadius: "0 0 8px 8px",
                transformOrigin: "top center",
                animation: "rightLegSwing 0.8s ease-in-out infinite",
              }}>
                {/* Right foot */}
                <div style={{ position: "absolute", bottom: 0, left: "-4px", width: "30px", height: "12px", background: "#e8651a", borderRadius: "6px" }} />
              </div>
            </div>

            {/* Shadow */}
            <div style={{
              width: "80px",
              height: "12px",
              background: "#1a3a5c",
              borderRadius: "50%",
              opacity: 0.2,
              marginTop: "4px",
              animation: "shadowPulse 0.8s ease-in-out infinite",
            }} />
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
