export function LeadershipAlumniTestimonial({ className = "" }: { className?: string }) {
  return (
    <section
      className={`mt-6 border-t border-[#314363]/20 pt-5 ${className}`}
      aria-label="Leadership Austin alumni testimonial"
      data-testid="leadership-alumni-testimonial"
    >
      <p className="text-base italic leading-relaxed text-[#314363]">
        Leadership Austin gatherings bring alumni together beyond the big moments. Find a connection worth growing and a local story worth passing along.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Hey, all alumni. We created this space to stay connected with our Emerge Class 18 community and share upcoming events.
      </p>
      <div className="mt-4 border-t border-[#314363]/15 pt-3">
        <p className="leadership-testimonial-name text-sm font-semibold text-[#314363]">Alexandra Robertson</p>
        <p className="leadership-testimonial-meta text-xs font-medium tracking-wide text-muted-foreground">Class Rep</p>
        <p className="leadership-testimonial-meta text-xs tracking-wide text-muted-foreground">LA Emerge 18-2025</p>
      </div>
    </section>
  );
}
