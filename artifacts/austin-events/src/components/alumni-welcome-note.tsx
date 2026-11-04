export function AlumniWelcomeNote({ className = "" }: { className?: string }) {
  return (
    <section aria-labelledby="alumni-welcome-title" data-testid="section-alumni-welcome" className={`grid gap-5 border-y border-[#314363]/20 py-7 sm:grid-cols-[1fr_auto] sm:items-center ${className}`}>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#314363]/65">A welcome to all alumni</p>
        <h2 id="alumni-welcome-title" className="mt-1 text-3xl font-bold uppercase text-[#314363]">Stay connected. Share what’s next.</h2>
      </div>
      <div className="max-w-md border-l-4 border-[#FFBA01] pl-4 text-sm leading-relaxed text-muted-foreground">
        <p>Hey, all alumni. We created this space to stay connected with our Emerge Class 18 community and share upcoming events.</p>
        <p className="mt-2 font-semibold text-[#314363]">Alexandra Robertson</p>
      </div>
    </section>
  );
}
