import { useMemo } from "react";
import { useCommunityManagedEvents, useLatestDigest } from "@/hooks/use-events";
import { useTenant } from "@/contexts/tenant-context";
import { SubscribeForm } from "@/components/subscribe-form";
import { LeadershipEventContribution } from "@/components/leadership-event-contribution";
import { GOLF_COURSES } from "@/lib/golf-courses";
import { GolfHomePage } from "./golf-home";

function isGolfEvent(event: any): boolean {
  if (event?.managedEventId || event?.isPersistentManaged) return true;
  const searchable = [event?.title, event?.description, event?.venue, event?.category]
    .filter(Boolean)
    .join(" ");
  return /\bgolf\b|\bpga\b|\blpga\b|\bputt(?:ing)?\b/i.test(searchable);
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
    return [...managedEvents, ...digestEvents].filter((event) => {
      const key = `${String(event.title ?? "").trim().toLowerCase()}|${String(event.date ?? "").trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [latestDigest?.events, managedEventsQuery.data?.events]);

  return (
    <GolfHomePage
      events={events}
      isEventsLoading={managedEventsQuery.isLoading || digestQuery.isLoading}
      digestId={latestDigest?.id}
      courses={[...GOLF_COURSES]}
      subscribeForm={<SubscribeForm />}
      eventSubmissionForm={<LeadershipEventContribution communityName={tenant.name} japaneseGolf />}
    />
  );
}
