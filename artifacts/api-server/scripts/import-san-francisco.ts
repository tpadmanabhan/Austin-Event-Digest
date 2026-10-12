/**
 * Verified, unsent October 12–31, 2026 SF edition. Development import only.
 * Run from the workspace with pnpm --filter @workspace/scripts exec tsx
 * ../artifacts/api-server/scripts/import-san-francisco.ts
 * Uses the existing tenant-authenticated API; never sends or changes production.
 */
import { db, pool, tenantsTable, digestsTable, EventItemSchema, type EventItem } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { createHmac } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { lookupKnownVenue } from "../src/lib/knownVenues";

const slug = "sanfrancisco";
const subject = "San Francisco Events — October 12 – October 31, 2026";
const intro = "Hello, San Francisco! Your October 12–31 guide brings together hands-on science, literary afternoons, Warriors basketball, outdoor movement, and community activities across the city. Explore Tech, Arts, Sports, Civics, and Wellness, meet the local spotlights, and take a fresh look at AI Ethics. Times are San Francisco local time (PDT). Check organizer pages for current tickets, registration, age limits, and any changes before heading out.";
const events: EventItem[] = [];
const places = {
  exploratorium: "Exploratorium, Pier 15, Embarcadero at Green Street, San Francisco, CA 94111",
  academy: "California Academy of Sciences, 55 Music Concourse Drive, San Francisco, CA 94118",
  chase: "Chase Center, 1 Warriors Way, San Francisco, CA 94158",
  campfire: "Presidio Tunnel Tops Campfire Circle, near 210 Lincoln Boulevard, San Francisco, CA 94129",
  yoga: "Outpost Meadow, 609 Mason Street, San Francisco, CA 94129",
};
function add(day: number, hour: string, title: string, category: string, venue: string, description: string, link: string, imageUrl?: string, end?: string) {
  const startDate = `2026-10-${String(day).padStart(2, "0")}T${hour}:00-07:00`;
  const start = new Date(startDate);
  const date = start.toLocaleString("en-US", { timeZone: "America/Los_Angeles", weekday: "long", month: "short", day: "numeric" });
  const time = start.toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" });
  events.push(EventItemSchema.parse({
    title, date: `${date} at ${time}`, category, venue, description, link,
    imageUrl: imageUrl || null, source: "Curated from official organizer", featured: false,
    startDate, ...(end ? { endDate: `2026-10-${String(day).padStart(2, "0")}T${end}:00-07:00` } : {}),
    timezone: "America/Los_Angeles", venueAddress: venue,
  }));
}
const campfireImage = "https://wp.presidio.gov/wp-content/uploads/2024/01/20220717_PMM_2300-2.jpg";
for (const day of [12, 19, 26, 31]) {
  add(day, "15:00", "Park Ranger Campfire Talks", "Civics", places.campfire,
    "Gather for a free, 30-minute National Park Service ranger talk about the Presidio's people and history. All ages welcome; enjoy the park before or after the talk.",
    `https://presidio.gov/explore/events/park-ranger-campfire-talks-2/2026-10-${day}/`, campfireImage, "15:30");
}
const exImage = "https://www.exploratorium.edu/sites/default/files/styles/responsive_2000w/public/2026-09/AfterDark-Mars-03839_25SFC-marquee.jpg.webp?itok=ZDSYBsFi";
add(15, "18:00", "After Dark: Speak Easy", "Tech", places.exploratorium,
  "Explore the science of communication and perception with interactive exhibits, conversations, games, and an improv workshop. Adults 18+; paid admission. Organizer registration is separate from platform interest.",
  "https://www.exploratorium.edu/visit/calendar/after-dark-speak-easy", exImage, "22:00");
add(22, "18:00", "After Dark: Death and Life / La muerte y la vida", "Arts", places.exploratorium,
  "Celebrate Día de los Muertos and explore the cultural traditions and science surrounding the circle of life. Adults 18+; tickets required.",
  "https://www.exploratorium.edu/visit/calendar/after-dark-death-and-life",
  "https://www.exploratorium.edu/sites/default/files/styles/responsive_16_9_1450w/public/2026-09/FestivalOfAltars-00371_25ITH-pod.jpg.webp?h=44b879e5&itok=XXBHIPU4", "22:00");
add(29, "18:00", "After Dark: Creepatorium", "Arts", places.exploratorium,
  "The Exploratorium's annual Halloween party features Gothicumbia, science-themed costumes, and hands-on exhibits. Adults 18+; tickets required.",
  "https://www.exploratorium.edu/visit/calendar/after-dark-creepatorium",
  "https://www.exploratorium.edu/sites/default/files/styles/responsive_16_9_1450w/public/2024-08/Explo_Halloween_03_pod.jpg.webp?h=d07dec50&itok=_EmlKLGz", "22:00");
for (const [day, title, path, description, image] of [
  [15, "NightLife: October 15", "nightlife-october-15", "Explore the aquarium, rainforest, and science museum after dark, with conversation and creativity. Ages 21+; $26 admission, planetarium passes sold separately.", "rainforest_1015.jpg"],
  [22, "NightLife: Día de los Muertos", "nightlife-d%C3%ADa-de-los-muertos", "Celebrate with art, music, tradición, and a special tribute to Claude. Ages 21+; $26 admission, planetarium passes sold separately.", "cas_nightlife_dia_de_los_muertos_website_header_1200x900.png"],
  [29, "Fright NightLife", "fright-nightlife", "Join the Academy's Halloween haunt with Peaches Christ and explore its living exhibits. Ages 21+; $26 admission, planetarium passes sold separately.", "peaches_halloween_placeholder.png"],
] as const) {
  add(day, "18:00", title, "Arts", places.academy, description,
    `https://www.calacademy.org/nightlife/${path}`, `https://www.calacademy.org/sites/default/files/assets/${image}`, "22:00");
}
const chaseBase = "https://www.chasecenter.com/events/";
add(16, "19:00", "Warriors vs. Trail Blazers — Preseason", "Sports", places.chase,
  "Golden State hosts Portland in a preseason game. Game starts at 7 p.m.; doors open at 5:30 p.m. Check the official page for tickets and arena policies.",
  `${chaseBase}20261016-gsw-vs-por/`, "https://cdn.nba.com/teams/uploads/sites/1610612744/2026/09/DESIGN-GSW_BM_20261016_MU_POR_Broadcast_GFX_1280x720_Web_App.jpg");
add(18, "14:30", "Warriors Open Practice, Presented by Waymo", "Sports", places.chase,
  "Watch a team practice and a Q&A with Steve Kerr and Bob Fitzgerald. $5 tickets; net proceeds benefit the Golden State Community Foundation. Doors open at 2 p.m.; program begins at 2:30 p.m.",
  `${chaseBase}warriors-open-practice-20261018/`, "https://cdn.nba.com/teams/uploads/sites/1610612744/2026/10/DESIGN-GSW_CP_20261001_Open_Practice_presented_by_Waymo_v1_1280x720-1-1.jpg");
add(23, "19:00", "Warriors vs. Grizzlies", "Sports", places.chase,
  "Golden State hosts Memphis at Chase Center. Game starts at 7 p.m.; doors open at 5:30 p.m. Check the official page for tickets and arena policies.",
  `${chaseBase}20261023-gsw-vs-mem/`, "https://cdn.nba.com/teams/uploads/sites/1610612744/2026/10/DESIGN-GSW_BM_20261023_MU_MEM_Broadcast_GFX_1280x720_Lifecycle-1-1.jpg");
add(15, "20:00", "Young Miko", "Arts", places.chase, "Catch Young Miko at Chase Center. Ticketed live music; check the venue's official event page for entry policies.",
  `${chaseBase}young-miko-20261015/`, "https://cdn.nba.com/teams/uploads/sites/1610612744/2026/04/CC_BM_20261015_Young_Miko_DIGITAL_GFX_1005x600_v3.jpg");
add(25, "19:30", "Doja Cat with special guest Latto", "Arts", places.chase, "The Tour Ma Vie World Tour comes to Chase Center. Ticketed concert; confirm availability and entry policies with the venue.",
  `${chaseBase}doja-cat-20261025/`);
for (const day of [27, 28]) add(day, "19:30", "Phoebe Bridgers", "Arts", places.chase, "An individually dated Chase Center performance. Check the official page for tickets and entry policies.",
  `${chaseBase}phoebe-bridgers-202610${day}/`, "https://cdn.nba.com/teams/uploads/sites/1610612744/2026/06/CC_BM_20260605_Phoebe_Bridgers_2nd_Night_DIGITAL_ArtistTourName_1005x600.jpg");
add(17, "12:30", "ZYZZYVA Movie Matinee with Ingrid Rojas Contreras and Andrew Sean Greer", "Arts",
  "Roxie Theater, 3117 16th Street, San Francisco, CA 94103",
  "Litquake presents a special screening of Fellini's Amarcord, selected by Andrew Sean Greer and presented by Ingrid Rojas Contreras. Reserve a place through the Roxie; check its event page for ticket details.",
  "https://roxie.com/film/zyzzyva-movie-matinee-with-ingrid-rojas-contreras-amarcord/", undefined, "14:30");
add(24, "11:00", "Awesöme Orchestra at the Exploratorium", "Arts", places.exploratorium,
  "Watch a concert come together as musicians rehearse and perform music from KPop Demon Hunters and selections by Oscar Navarro. Check museum admission and access details.",
  "https://www.exploratorium.edu/visit/calendar/awesome-orchestra", undefined, "16:00");
add(24, "11:00", "We All Journey", "Arts", places.exploratorium,
  "Explore Monarch butterfly migration, paint a butterfly, and see a colorful Día de Muertos altar. Check museum admission and access details.",
  "https://www.exploratorium.edu/visit/calendar/we-all-journey", undefined, "14:00");
for (const day of [18, 25]) add(day, "10:00", "Free Yoga in the Park", "Wellness", places.yoga,
  "A free outdoor yoga and mindfulness class for all experience levels. Advance registration required; limited to 50 participants. Bring a mat and arrive 15 minutes early. Registered guests receive weather/location updates.",
  `https://presidio.gov/explore/events/free-yoga-in-the-park/2026-10-${day}/`,
  "https://wp.presidio.gov/wp-content/uploads/2026/08/20260812_Wellness_Yoga_Outpost_Meadow_3.jpg", "11:00");
add(18, "09:00", "DSE Presidio Wall 5K XC", "Wellness", "Presidio Wall Playground, West Pacific Avenue and Spruce Street, San Francisco, CA",
  "DSE Runners' cross-country 5K starts on the grass lawn beside Presidio Wall Playground. Check-in begins 45 minutes before the 9 a.m. start; confirm race-day course and registration with DSE.",
  "https://dserunners.com/event/presidio-wall-5k-xc-4/?instance_id=4007", undefined, "11:00");
add(25, "09:00", "DSE Halloween Sunset Dunes 5K & Kids' Run", "Wellness", "Great Highway and Taraval Street, San Francisco, CA",
  "Run north along the Great Highway from Taraval and return. Adult 5K starts at 9 a.m.; the kids' run follows its finish. Check-in begins 45 minutes before the start; confirm course and registration with DSE.",
  "https://dserunners.com/event/halloween-sunset-dunes-5k-kids-run/?instance_id=4009", undefined, "11:00");
add(30, "18:00", "Late Night Editions: Halloween Eve", "Arts", "de Young Museum, 50 Hagiwara Tea Garden Drive, San Francisco, CA 94118",
  "An after-hours evening of art, DJ sets, food trucks, and art-inspired costumes at the de Young. Ages 21+; general admission $45, VIP $95. Advance reservations strongly recommended.",
  "https://www.famsf.org/events/late-night-editions-halloween-eve", undefined, "22:00");
// Source lists Oct 27–29 as all-day; do not invent a session time or an ISO instant.
events.push(EventItemSchema.parse({
  title: "The Art of Tinkering Workshop", date: "Tuesday, Oct 27 – Thursday, Oct 29, 2026",
  venue: places.exploratorium, category: "Tech", featured: false, source: "Exploratorium official calendar",
  description: "A three-day professional development workshop on hands-on making, facilitation, and science/technology learning. Designed for educators; check organizer registration, cost, and daily session times.",
  link: "https://www.exploratorium.edu/visit/calendar/art-tinkering-workshop", imageUrl: null,
}));
events.sort((a, b) => {
  const stamp = (e: EventItem) => e.startDate ? Date.parse(e.startDate) : Date.parse("2026-10-27T12:00:00-07:00");
  return stamp(a) - stamp(b);
});
events.push(
  EventItemSchema.parse({ title: "City Lights Booksellers & Publishers", date: "", venue: "261 Columbus Avenue, San Francisco, CA 94133",
    category: "Arts", description: "An independent literary meeting place founded in 1953, with poetry, fiction, translations, politics, and books from small publishers. Visit its North Beach bookstore or explore the official events calendar. Editorial spotlight, not a paid endorsement.",
    link: "https://citylights.com/bookstore/", imageUrl: null, source: "City Lights official website", isBusinessSpotlight: true, featured: false }),
  EventItemSchema.parse({ title: "San Francisco–Marin Food Bank", date: "", venue: "", category: "Civics",
    description: "Help a local nonprofit working to end hunger in San Francisco and Marin. Explore warehouse, neighborhood distribution, or home-delivery volunteering through its official portal. Choose and confirm an available shift directly with the Food Bank; no placement is guaranteed.",
    link: "https://www.sfmfoodbank.org/volunteer/", imageUrl: null, source: "San Francisco–Marin Food Bank official website", isPost: true, featured: false }),
);
async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Development-only import; production writes are not authorized.");
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.slug, slug)).limit(1);
  if (!tenant?.passwordHash) throw new Error("San Francisco development tenant/admin auth is not configured.");
  const [existing] = await db.select().from(digestsTable)
    .where(and(eq(digestsTable.tenantId, tenant.id), eq(digestsTable.subject, subject))).limit(1);
  const token = createHmac("sha256", tenant.passwordHash).update("admin-session").digest("hex");
  if (existing) {
    const corrected = existing.events.map(event => {
      const coords = lookupKnownVenue(event.venue, slug);
      return coords ? { ...event, lat: coords.lat, lng: coords.lng } : event;
    });
    const patch = await fetch(`http://localhost:80/api/events/digest/${existing.id}/events`, {
      method: "PATCH", headers: { "X-Tenant-Slug": slug, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ events: corrected }),
    });
    if (!patch.ok) throw new Error(`Verified-location correction failed: HTTP ${patch.status}`);
    const retry = await fetch(`http://localhost:80/api/events/digest/${existing.id}/regeocoded`, {
      method: "POST", headers: { "X-Tenant-Slug": slug, Authorization: `Bearer ${token}` },
    });
    if (!retry.ok) throw new Error(`Location retry failed: HTTP ${retry.status}`);
    const preview = await fetch(`http://localhost:80/api/events/digest/${existing.id}/preview-email`, {
      headers: { "X-Tenant-Slug": slug, Authorization: `Bearer ${token}` },
    });
    if (!preview.ok) throw new Error(`Preview failed: HTTP ${preview.status}`);
    await writeFile("/tmp/san-francisco-email-preview.html", await preview.text());
    console.log(JSON.stringify({ existing: true, digestId: existing.id, geocodingRetry: true }));
    return;
  }
  const res = await fetch("http://localhost:80/api/events/digest/import", {
    method: "POST", headers: { Host: `${slug}.eventcarpooling.com`, "X-Tenant-Slug": slug, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ weekOf: "2026-10-12", subject, intro, events }),
  });
  if (!res.ok) throw new Error(`Import failed: HTTP ${res.status}`);
  const result = await res.json();
  if (!result.digest?.id || result.digest.events.length !== events.length) throw new Error("Imported edition failed count verification.");
  const preview = await fetch(`http://localhost:80/api/events/digest/${result.digest.id}/preview-email`, {
    headers: { Host: `${slug}.eventcarpooling.com`, "X-Tenant-Slug": slug, Authorization: `Bearer ${token}` },
  });
  if (!preview.ok) throw new Error(`Preview failed: HTTP ${preview.status}`);
  const html = await preview.text();
  for (const term of ["October 12", "31, 2026", "AI Ethics", "City Lights", "Food Bank", "The AI Con"]) {
    if (!html.includes(term)) throw new Error(`Email preview missing: ${term}`);
  }
  await writeFile("/tmp/san-francisco-email-preview.html", html);
  console.log(JSON.stringify({ digestId: result.digest.id, regularEvents: events.filter(e => !e.isPost && !e.isBusinessSpotlight).length,
    spotlights: 2, sent: false, categories: [...new Set(events.map(e => e.category))] }));
}
main().catch(err => { console.error(err.message); process.exitCode = 1; }).finally(() => pool.end());
