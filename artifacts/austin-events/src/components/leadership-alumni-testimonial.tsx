import { LeadershipClassProfiles } from "./leadership-class-profiles";
import type { LeadershipClassProfile } from "../../../../shared/leadership-class-profiles";

export function LeadershipAlumniTestimonial({
  className = "",
  profiles,
}: {
  className?: string;
  profiles?: LeadershipClassProfile[] | null;
}) {
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
      <LeadershipClassProfiles profiles={profiles} />
    </section>
  );
}
