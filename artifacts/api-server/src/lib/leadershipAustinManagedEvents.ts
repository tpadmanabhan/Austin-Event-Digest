import { and, asc, eq } from "drizzle-orm";
import { db, leadershipEventsTable, tenantsTable } from "@workspace/db";
import { geocodeEvents } from "./geocodeVenue";

const AUSTIN_COMMON_EVENTS_URL = "https://theaustincommon.com/events/";
const SOURCE_ALUMNI = "Amy Stansbury";

const INITIAL_EVENTS = [
  {
    seedKey: "austin-common-monarch-butterfly-tagging-2026-11-06",
    title: "Volunteer Opportunity: Monarch Butterfly Tagging at The Confluence",
    date: "Friday, November 6, 2026 · 9:00–11:00 AM CT",
    startDate: "2026-11-06T09:00:00-06:00",
    endDate: "2026-11-06T11:00:00-06:00",
    venue: "Grandpa’s Lakeview Terrace",
    venueAddress: "71 1/2 Trinity St.",
    description: "Tag monarch butterflies during Waterloo Park’s annual migration, with a short presentation followed by hands-on tagging.",
    link: "https://theaustincommon.com/event/volunteer-opportunity-monarch-butterfly-tagging-at-the-confluence/",
    category: "Civics",
    organizer: "Waterloo Greenway",
  },
  {
    seedKey: "austin-common-veterans-parade-2026-11-07",
    title: "2026 Austin Veterans Parade",
    date: "Saturday, November 7, 2026 · 9:00 AM CT",
    startDate: "2026-11-07T09:00:00-06:00",
    endDate: null,
    venue: "Congress Avenue",
    venueAddress: null,
    description: "Join the Austin Veterans Parade from Congress Avenue to the Texas Capitol Veterans Day ceremony.",
    link: "https://theaustincommon.com/event/2026-austin-veterans-parade/",
    category: "Civics",
    organizer: "Military Veterans Empowerment Network",
  },
  {
    seedKey: "austin-common-butler-trail-seaholm-open-house-2026-11-07",
    title: "Open House: Programming on the Butler Trail & Seaholm Waterfront",
    date: "Saturday, November 7, 2026 · 9:00–11:00 AM CT",
    startDate: "2026-11-07T09:00:00-06:00",
    endDate: "2026-11-07T11:00:00-06:00",
    venue: "Seaholm Intake Building",
    venueAddress: "801 W. Cesar Chavez St.",
    description: "Share feedback on future community programming on the Butler Trail and at the Seaholm Waterfront.",
    link: "https://theaustincommon.com/event/open-house-programming-on-the-butler-trail-seaholm-waterfront/",
    category: "Civics",
    organizer: "The Trail Conservancy",
  },
  {
    seedKey: "austin-common-cyclovia-atx-2026-11-07",
    title: "Cyclovia ATX 2026",
    date: "Saturday, November 7, 2026 · 10:00 AM–2:00 PM CT",
    startDate: "2026-11-07T10:00:00-06:00",
    endDate: "2026-11-07T14:00:00-06:00",
    venue: "Windsor Park Branch Library",
    venueAddress: "5833 Westminster Dr",
    description: "A free public street festival produced by Ghisallo Cycling Initiative, with routes open to pedestrians and cyclists.",
    link: "https://theaustincommon.com/event/cyclovia-atx-2026/",
    category: "Sports",
    organizer: "Ghisallo Cycling Initiative",
  },
  {
    seedKey: "austin-common-neighborwoods-tree-adoption-2026-11-07",
    title: "NeighborWoods Tree Adoption",
    date: "Saturday, November 7, 2026 · 11:00 AM–1:00 PM CT",
    startDate: "2026-11-07T11:00:00-06:00",
    endDate: "2026-11-07T13:00:00-06:00",
    venue: "H-E-B TechRidge",
    venueAddress: "500 Canyon Ridge Dr",
    description: "Austin residents and Austin Energy customers can take home a free five-gallon tree through TreeFolks’ NeighborWoods program.",
    link: "https://theaustincommon.com/event/neighborwoods-tree-adoption-25/",
    category: "Civics",
    organizer: "TreeFolks",
  },
  {
    seedKey: "austin-common-brave-fest-2026-11-07",
    title: "BRAVE Fest 2026",
    date: "Saturday, November 7, 2026 · 12:00–5:00 PM CT",
    startDate: "2026-11-07T12:00:00-06:00",
    endDate: "2026-11-07T17:00:00-06:00",
    venue: "Central Machine Works",
    venueAddress: "4824 E. Cesar Chavez St.",
    description: "A celebration of belonging and inclusion with music, dance, entrepreneurs, creatives, and local changemakers.",
    link: "https://theaustincommon.com/event/brave-fest-2026/",
    category: "Arts",
    organizer: "BRAVE Communities",
  },
  {
    seedKey: "austin-common-backyard-composting-101-2026-11-08",
    title: "Backyard Composting 101",
    date: "Sunday, November 8, 2026 · 10:00 AM–1:00 PM CT",
    startDate: "2026-11-08T10:00:00-06:00",
    endDate: "2026-11-08T13:00:00-06:00",
    venue: "Festival Beach Food Forest",
    venueAddress: null,
    description: "Learn how to compost food scraps, grass clippings, and other household waste at home, including how to avoid odors and rodents.",
    link: "https://theaustincommon.com/event/backyard-composting-101/",
    category: "Civics",
    organizer: "Festival Beach Food Forest",
  },
  {
    seedKey: "austin-common-solar-celebration-keep-austin-fed-2026-11-08",
    title: "Solar Celebration at Keep Austin Fed",
    date: "Sunday, November 8, 2026 · 12:00–2:00 PM CT",
    startDate: "2026-11-08T12:00:00-06:00",
    endDate: "2026-11-08T14:00:00-06:00",
    venue: "Vesper",
    venueAddress: "3106 E. 14½ St.",
    description: "Celebrate Solar Austin’s donated solar installation serving Vesper and Keep Austin Fed.",
    link: "https://theaustincommon.com/event/solar-celebration-at-keep-austin-fed/",
    category: "Civics",
    organizer: "Solar Austin",
  },
  {
    seedKey: "austin-common-coaching-others-2026-11-09",
    title: "Coaching Others: Develop High-Performance Teams",
    date: "Monday, November 9, 2026 · 9:00 AM–12:00 PM CT",
    startDate: "2026-11-09T09:00:00-06:00",
    endDate: "2026-11-09T12:00:00-06:00",
    venue: "Leadership Austin Offices",
    venueAddress: "1609 Shoal Creek Blvd",
    description: "Learn a coaching framework for developing people, addressing unhelpful behaviors, and building high-performance conversations.",
    link: "https://theaustincommon.com/event/coaching-others-develop-high-performance-teams-3/",
    category: "Programs",
    organizer: "Leadership Austin",
  },
  {
    seedKey: "austin-common-taste-of-texas-2026-11-10",
    title: "A Taste Of Texas: Food, Immigration, & Identity",
    date: "Tuesday, November 10, 2026 · 6:30–8:30 PM CT",
    startDate: "2026-11-10T18:30:00-06:00",
    endDate: "2026-11-10T20:30:00-06:00",
    venue: "LBJ Presidential Library",
    venueAddress: "2313 Red River St.",
    description: "Explore how food carries stories of Texas history, immigration, identity, and culture alongside the LBJ Library’s What We Bring to the Table exhibition.",
    link: "https://theaustincommon.com/event/a-taste-of-texas-food-immigration-identity/",
    category: "Arts",
    organizer: "LBJ Future Forum",
  },
] as const;

function localDay(value: Date, timezone: string): string | null {
  if (!Number.isFinite(value.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(value);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values["year"]}-${values["month"]}-${values["day"]}`;
  } catch {
    return null;
  }
}

const LOCATION_NEEDS_REVIEW = new Set([
  "Grandpa’s Lakeview Terrace",
  "Congress Avenue",
  "Seaholm Intake Building",
  "Vesper",
  "Leadership Austin Offices",
]);

export async function listUpcomingCommunityEvents(tenantId: number) {
  const rows = await db
    .select()
    .from(leadershipEventsTable)
    .where(and(
      eq(leadershipEventsTable.tenantId, tenantId),
      eq(leadershipEventsTable.isActive, true),
      eq(leadershipEventsTable.submissionStatus, "approved"),
    ))
    .orderBy(asc(leadershipEventsTable.startDate), asc(leadershipEventsTable.id));
  const today = localDay(new Date(), "America/Chicago");
  const upcoming = rows.filter((row) => {
    const eventDay = localDay(new Date(row.endDate || row.startDate), row.timezone);
    return !!today && !!eventDay && eventDay >= today;
  });
  const eventLocations = upcoming.map((row) => {
    // Do not pin a route or a location whose geocoder result did not identify the venue.
    const locationNeedsReview = LOCATION_NEEDS_REVIEW.has(row.venue.trim());
    return {
      venue: locationNeedsReview
        ? ""
        : [row.venue, row.venueAddress, "Austin, Texas"].filter(Boolean).join(", "),
    };
  });
  const geocoded = await geocodeEvents(eventLocations, "austin");
  return upcoming.map((row, index) => ({
    ...row,
    lat: typeof geocoded[index]?.["lat"] === "number" ? geocoded[index]["lat"] as number : null,
    lng: typeof geocoded[index]?.["lng"] === "number" ? geocoded[index]["lng"] as number : null,
  }));
}

export async function listUpcomingLeadershipEvents() {
  const [tenant] = await db
    .select({ id: tenantsTable.id })
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, "leadershipaustin"))
    .limit(1);
  return tenant ? listUpcomingCommunityEvents(tenant.id) : [];
}

export async function seedLeadershipAustinManagedEvents(): Promise<void> {
  const [tenant] = await db
    .select({ id: tenantsTable.id })
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, "leadershipaustin"))
    .limit(1);
  if (!tenant) return;

  await db.insert(leadershipEventsTable).values(INITIAL_EVENTS.map((event) => ({
    ...event,
    tenantId: tenant.id,
    timezone: "America/Chicago",
    sourceName: "The Austin Common",
    sourceUrl: AUSTIN_COMMON_EVENTS_URL,
    sourceAlumni: SOURCE_ALUMNI,
    imageUrl: null,
    isActive: true,
  }))).onConflictDoNothing();
}
