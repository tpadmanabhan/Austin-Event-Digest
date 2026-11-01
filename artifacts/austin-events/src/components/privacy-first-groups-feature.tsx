export function PrivacyFirstGroupsFeature({ className = "" }: { className?: string }) {
  return (
    <section
      aria-labelledby="privacy-first-groups-title"
      className={`relative overflow-hidden rounded-3xl p-8 sm:p-10 ${className}`}
      style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e293b 55%,#0f3460 100%)" }}
    >
      <div className="relative z-10 max-w-3xl">
        <div
          className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest"
          style={{ background: "rgba(255,255,255,0.12)", color: "#93c5fd", border: "1px solid rgba(147,197,253,0.3)" }}
        >
          Coming soon · Austin pilot
        </div>
        <div className="rounded-2xl p-5 sm:p-6" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="mb-2 text-2xl" aria-hidden="true">🔒</div>
          <h3 id="privacy-first-groups-title" className="mb-2 font-serif text-2xl font-bold text-white sm:text-3xl">
            Groups, designed privacy-first
          </h3>
          <p className="text-sm leading-relaxed text-slate-300 sm:text-base">
            Local hosts will bring small neighborhood groups together regularly. People can start with a username, without sharing an email address or phone number, and get to know the group at their own pace.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Privacy features">
          {["Username first", "No email required", "No phone number required"].map((tag) => (
            <span
              key={tag}
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: "rgba(255,255,255,0.08)", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
