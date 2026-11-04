export function LeadershipAlumniTestimonial({ className = "" }: { className?: string }) {
  return (
    <section
      className={`mt-6 border-t border-[#314363]/20 pt-5 ${className}`}
      aria-label="Leadership Austin alumni testimonial"
      data-testid="leadership-alumni-testimonial"
      style={{ fontFamily: "'Figtree', Arial, sans-serif" }}
    >
      <p className="text-lg font-semibold italic leading-relaxed text-[#314363] sm:text-xl">
        Leadership Austin gatherings bring alumni together beyond the big moments. Find a connection worth growing and a local story worth passing along.
      </p>
      <p className="mt-4 border-l-2 border-[#bd5d43] bg-[#f7f4ef] px-4 py-3 text-base font-medium leading-relaxed text-[#334155] sm:text-lg">
        <span className="font-bold text-[#a94832]">Hey, all alumni.</span>{" "}
        We created this space to stay connected with our Emerge Class 18 community and share upcoming events.
      </p>
      <div className="mt-4 border-t border-[#314363]/15 pt-3">
        <p className="leadership-testimonial-name text-sm font-semibold text-[#314363]">Alexandra Robertson</p>
        <p className="leadership-testimonial-meta text-xs font-medium tracking-wide text-muted-foreground">Class Rep</p>
        <p className="leadership-testimonial-meta text-xs tracking-wide text-muted-foreground">LA Emerge 18-2025</p>
      </div>
    </section>
  );
}
