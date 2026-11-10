import { useMemo } from "react";
import { useCommunityManagedEvents, useLatestDigest } from "@/hooks/use-events";
import { useTenant } from "@/contexts/tenant-context";
import { SubscribeForm } from "@/components/subscribe-form";
import { LeadershipEventContribution } from "@/components/leadership-event-contribution";
import { GOLF_COURSES } from "@/lib/golf-courses";
import { GolfHomePage } from "./golf-home";

const SPARK_GOLF_LOGO =
  "https://spark-golf.imgix.net/assets/spark-logo-d7427997.png?w=800&auto=format&fit=max";
const FIRST_TEE_COMMUNITY_IMAGE =
  "https://firsttee.org/wp-content/uploads/2025/09/RG2_1879-scaled.jpg";

function isGolfEvent(event: any): boolean {
  if (event?.isBusinessSpotlight || event?.isPost) return false;
  if (event?.managedEventId || event?.isPersistentManaged) return true;
  const searchable = [event?.title, event?.description, event?.venue, event?.category]
    .filter(Boolean)
    .join(" ");
  return /\bgolf\b|\bpga\b|\blpga\b|\bputt(?:ing)?\b/i.test(searchable);
}

function getGolfEventStartTime(event: any): number {
  const candidates = [event?.startDate, event?.date].filter(Boolean);
  for (const candidate of candidates) {
    const value = String(candidate);
    const direct = Date.parse(value);
    if (Number.isFinite(direct)) return direct;
    const firstDay = value.replace(/(\d{1,2})\s*[–-]\s*\d{1,2}/, "$1");
    const ranged = Date.parse(firstDay);
    if (Number.isFinite(ranged)) return ranged;
  }
  return Number.MAX_SAFE_INTEGER;
}

export default function GolfHomeRoute() {
  const tenant = useTenant();
  const digestQuery = useLatestDigest();
  const managedEventsQuery = useCommunityManagedEvents();
  const latestDigest = digestQuery.data?.digest;

  const events = useMemo(() => {
    const digestEvents = ((latestDigest?.events ?? []) as any[]).filter(isGolfEvent);
    const managedEvents = (managedEventsQuery.data?.events ?? []).filter(isGolfEvent);
    const seen = new Set<string>();
    const uniqueEvents = [...managedEvents, ...digestEvents].filter((event) => {
      const key = `${String(event.title ?? "").trim().toLowerCase()}|${String(event.date ?? "").trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return uniqueEvents.sort((a, b) =>
      Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
      getGolfEventStartTime(a) - getGolfEventStartTime(b)
    );
  }, [latestDigest?.events, managedEventsQuery.data?.events]);
  const spotlights = (latestDigest?.events ?? [])
    .filter((event: any) => event?.isBusinessSpotlight || event?.isPost)
    .map((event: any) => {
      const title = String(event.title ?? "");
      const link = String(event.link ?? "");
      const providedImage = typeof event.imageUrl === "string" ? event.imageUrl.trim() : "";
      const normalizedLink = link.toLowerCase();
      const fallbackImage = normalizedLink.includes("spark.golf")
        ? { src: SPARK_GOLF_LOGO, alt: "Spark Golf logo" }
        : normalizedLink.includes("firsttee.org")
          ? { src: FIRST_TEE_COMMUNITY_IMAGE, alt: "First Tee participants celebrating at a golf program" }
          : undefined;

      return {
        type: event.isBusinessSpotlight ? "business" as const : "community" as const,
        title,
        description: String(event.description ?? ""),
        link,
        imageSrc: providedImage || fallbackImage?.src,
        imageAlt: providedImage ? `${title} image` : fallbackImage?.alt,
      };
    })
    .filter((spotlight) => spotlight.title && spotlight.link);

  return (
    <GolfHomePage
      events={events}
      spotlights={spotlights}
      isEventsLoading={managedEventsQuery.isLoading || digestQuery.isLoading}
      digestId={latestDigest?.id}
      courses={[...GOLF_COURSES]}
      subscribeForm={<SubscribeForm />}
      eventSubmissionForm={<LeadershipEventContribution communityName={tenant.name} japaneseGolf />}
    />
  );
}
