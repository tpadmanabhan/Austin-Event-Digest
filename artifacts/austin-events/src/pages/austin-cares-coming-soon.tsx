export default function AustinCaresComingSoon() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#f5f5f4" }}>
      <div className="w-full max-w-2xl">
        <div
          style={{ background: "linear-gradient(135deg,#064e3b 0%,#065f46 55%,#047857 100%)" }}
          className="rounded-3xl p-8 sm:p-10"
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden">
              <img src="/austin-cares-logo.png" alt="Austin Cares" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "#a7f3d0" }}>
                Coming Soon
              </p>
              <p className="text-xl font-extrabold tracking-tight" style={{ color: "#ecfdf5" }}>
                Austin Cares Newsletter
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm leading-relaxed mb-6" style={{ color: "#d1fae5" }}>
            A dedicated newsletter for the heart of Austin —{" "}
            <strong style={{ color: "#ecfdf5" }}>Austin Cares</strong> will cover the issues and
            opportunities that make this city more than just a place to live:
          </p>

          {/* Feature grid */}
          <div className="grid grid-cols-3 gap-x-4 gap-y-3 mb-7">
            {[
              { emoji: "🏛️", label: "Civics & community" },
              { emoji: "🙌", label: "Volunteering opportunities" },
              { emoji: "💡", label: "Tech-for-good networking" },
              { emoji: "💰", label: "Fundraising campaigns" },
              { emoji: "💼", label: "Nonprofit job listings" },
              { emoji: "🏆", label: "Board-level recruiting" },
            ].map(({ emoji, label }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-lg flex-shrink-0">{emoji}</span>
                <span className="text-sm font-medium" style={{ color: "#d1fae5" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Closing line */}
          <p className="text-sm leading-relaxed mb-7" style={{ color: "#d1fae5" }}>
            If you care about making Austin a better city,{" "}
            <strong style={{ color: "#ecfdf5" }}>this one's for you. Watch this space.</strong>
          </p>

          {/* CTA */}
          <div className="text-center">
            <a
              href="https://eventcarpooling.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm font-bold no-underline px-7 py-3 rounded-full transition-opacity hover:opacity-90"
              style={{ background: "#fbbf24", color: "#1c1917" }}
            >
              Learn more at EventCarpooling.com →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
