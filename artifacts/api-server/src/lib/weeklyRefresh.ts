/**
 * weeklyRefresh.ts
 *
 * Scheduled every Sunday at 6 PM — fetches Ticketmaster events for each city
 * and merges hand-curated community events (auto-dated to the current week) into
 * the latest digest for each tenant.
 *
 * Handles tasks #98 (auto-schedule) + #99 (persistent community events).
 */

import { db, digestsTable, tenantsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { logger } from "./logger";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EventItem {
  title: string;
  date: string;
  venue: string;
  description: string;
  category: string;
  link: string | null;
  imageUrl: string | null;
  source?: string;
  featured?: boolean;
}

/** A recurring community event definition. dayOffset is relative to the Sunday
 *  weekStart: 0=this Sun … 6=this Sat, 7=next Sun … 13=next Sat. */
interface CommunityEventDef {
  title: string;
  dayOffset: number;
  time: string;          // "9:00 AM"
  venue: string;
  category: string;
  description: string;
  link: string | null;
}

// ── Day / date helpers ────────────────────────────────────────────────────────

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_ABBR    = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Format a date as "Thursday, Aug 7 at 6:00 PM" */
function formatCommunityDate(weekStart: Date, dayOffset: number, time: string): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + dayOffset);
  const weekday = WEEKDAY_NAMES[d.getDay()];
  const month   = MONTH_ABBR[d.getMonth()];
  const day     = d.getDate();
  return `${weekday}, ${month} ${day} at ${time}`;
}

/** Most recent Sunday at midnight UTC */
function currentWeekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun
  const sun = new Date(now);
  sun.setUTCDate(now.getUTCDate() - day);
  sun.setUTCHours(0, 0, 0, 0);
  return sun;
}

/** Format ISO string as "Weekday, Mon D at H:MM AM/PM" in a given timezone */
function formatTmDate(isoStr: string, tz: string): string {
  try {
    const d = new Date(isoStr);
    const weekday = d.toLocaleDateString("en-US", { weekday: "long", timeZone: tz });
    const month   = d.toLocaleDateString("en-US", { month: "short",  timeZone: tz });
    const day     = d.toLocaleDateString("en-US", { day: "numeric",  timeZone: tz });
    const time    = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
    return `${weekday}, ${month} ${day} at ${time}`;
  } catch {
    return isoStr.substring(0, 10);
  }
}

/** Decode HTML entities in URLs */
function decodeHtml(str: string | null | undefined): string | null {
  if (!str) return null;
  return str
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

// ── Parse human-readable event dates (for past-event filtering) ───────────────

const MONTH_MAP: Record<string, number> = {
  Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11,
};

function parseDateString(str: string): Date | null {
  if (!str) return null;
  const m = str.match(/([A-Z][a-z]+)\s+(\d+)\s+at\s+(\d+):(\d+)\s+(AM|PM)/i);
  if (!m) return null;
  const [, month, day, hours, minutes, ampm] = m;
  const mo = MONTH_MAP[month.substring(0, 3)];
  if (mo === undefined) return null;
  let h = parseInt(hours, 10);
  if (ampm.toUpperCase() === "PM" && h !== 12) h += 12;
  if (ampm.toUpperCase() === "AM" && h === 12) h = 0;
  return new Date(new Date().getFullYear(), mo, parseInt(day, 10), h, parseInt(minutes, 10));
}

function guessCategory(text: string): string {
  const t = text.toLowerCase();
  if (/concert|live music|band|dj|festival|jazz|hip.?hop|indie|folk|rock|country/.test(t)) return "Music";
  if (/art|gallery|exhibit|paint|theatre|theater|film|museum|poetry|comedy|dance/.test(t)) return "Arts";
  if (/sport|run|marathon|5k|yoga|fitness|hike|bike|swim|basketball|soccer|football/.test(t)) return "Sports";
  if (/food|wine|beer|tasting|brunch|cook|restaurant|market|farm/.test(t)) return "Food";
  if (/tech|startup|hackathon|ai|developer|coding|data|software|entrepreneur/.test(t)) return "Tech";
  if (/wellness|meditat|mental|health|mindful|therapy/.test(t)) return "Wellness";
  if (/community|civic|volunteer|charity|nonprofit|neighbor/.test(t)) return "Civics";
  return "Arts";
}

// ── Community event definitions (day offsets from Sunday weekStart) ───────────
// dayOffset:  0=this Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
//             7=next Sun, 8=Mon, 9=Tue, 10=Wed, 11=Thu, 12=Fri, 13=next Sat
// Events with dayOffset >= 7 are automatically tagged featured: true

const COMMUNITY_EVENTS: Record<string, CommunityEventDef[]> = {

  austincares: [
    {
      title: "Central Texas Food Bank — Volunteer Shift",
      dayOffset: 4, time: "9:00 AM",
      venue: "Central Texas Food Bank, 6500 Metropolis Dr, Austin, TX",
      category: "Civics",
      description: "Sort and pack food for hungry families across Central Texas. Shifts are 3 hours and open to everyone — no experience needed. One of Austin's most impactful volunteer opportunities.",
      link: "https://www.centraltexasfoodbank.org/volunteer",
    },
    {
      title: "Austin Animal Center — Community Dog Walk",
      dayOffset: 5, time: "8:00 AM",
      venue: "Austin Animal Center, 7201 Levander Loop, Austin, TX",
      category: "Wellness",
      description: "Help shelter dogs get exercise and socialization before they find their forever homes. Drop-in friendly — just show up with your walking shoes.",
      link: "https://www.austintexas.gov/department/austin-animal-center",
    },
    {
      title: "Keep Austin Beautiful — Trail Cleanup",
      dayOffset: 7, time: "8:00 AM",
      venue: "Barton Creek Greenbelt, Barton Springs Rd Entrance, Austin, TX",
      category: "Civics",
      description: "Join Keep Austin Beautiful's weekly trail cleanup and protect one of the city's most beloved green spaces. Gloves and bags provided — bring water and sunscreen.",
      link: "https://www.keepaustinbeautiful.org",
    },
    {
      title: "Austin Disaster Relief Network — Community Prep Workshop",
      dayOffset: 8, time: "10:00 AM",
      venue: "Austin Disaster Relief Network, 9901 Burnet Rd, Austin, TX",
      category: "Civics",
      description: "Learn hands-on disaster preparedness skills — from emergency food storage to neighborhood response networks. Free and open to the public.",
      link: "https://www.adrn.org",
    },
    {
      title: "Austin Community Fridge Network — Supply Drop",
      dayOffset: 10, time: "5:00 PM",
      venue: "Various Austin Locations (see website)",
      category: "Civics",
      description: "Help stock Austin's network of community fridges with fresh food and shelf-stable items. Meet your neighbors and fight food insecurity.",
      link: "https://www.austincommunityfridge.com",
    },
  ],

  sacramento: [
    {
      title: "Sacramento Public Library — Community Connections Day",
      dayOffset: 4, time: "10:00 AM",
      venue: "Sacramento Public Library, 828 I St, Sacramento, CA",
      category: "Civics",
      description: "Connect with local nonprofits, city services, and community organizations. Free resources, workshops, and giveaways. Open to all Sacramento residents.",
      link: "https://www.saclibrary.org",
    },
    {
      title: "Old Sacramento Waterfront — Free Summer Concert",
      dayOffset: 5, time: "6:00 PM",
      venue: "Old Sacramento Waterfront, K St & Front St, Sacramento, CA",
      category: "Arts",
      description: "Live music on the waterfront with views of the Tower Bridge. Local bands, food vendors, and free entry. One of Sacramento's best summer traditions.",
      link: "https://www.oldsacramento.com",
    },
    {
      title: "Midtown Farmers Market",
      dayOffset: 6, time: "8:00 AM",
      venue: "20th & J St, Sacramento, CA 95811",
      category: "Food & Markets",
      description: "Sacramento's beloved Midtown market with 40+ local farms and vendors. Fresh produce, artisan cheeses, honey, and prepared food. A true Saturday morning tradition.",
      link: "https://www.sacramento.org/neighborhoods/midtown/",
    },
    {
      title: "Sacramento Urban Bee Festival",
      dayOffset: 8, time: "10:00 AM",
      venue: "Soil Born Farms, 2140 Chase Dr, Rancho Cordova, CA",
      category: "Wellness",
      description: "Celebrate urban beekeeping and food justice at this annual outdoor festival. Live demos, local honey tasting, kids' activities, and farm tours.",
      link: "https://www.soilbornfarms.org",
    },
    {
      title: "Sac Tech Meetup — AI & Automation",
      dayOffset: 9, time: "6:00 PM",
      venue: "The Urban Hive, 1601 Alhambra Blvd, Sacramento, CA",
      category: "Tech",
      description: "Sacramento's tech community gathers monthly for lightning talks, demos, and networking. This week: AI and automation tools for local businesses. Free to attend.",
      link: "https://www.meetup.com/sacramento-tech/",
    },
    {
      title: "Land Park Farmers Market",
      dayOffset: 13, time: "8:00 AM",
      venue: "William Land Park, Sutterville Rd & Park Dr, Sacramento, CA",
      category: "Food & Markets",
      description: "A neighborhood gem inside beautiful William Land Park. Local produce, fresh flowers, baked goods, and breakfast burritos you won't forget.",
      link: "https://www.agriculturaldistrict.org",
    },
  ],

  portland: [
    {
      title: "Portland Community Gardens — Open Garden Day",
      dayOffset: 4, time: "10:00 AM",
      venue: "Fulton Community Garden, 68 SW Miles St, Portland, OR",
      category: "Wellness",
      description: "Portland's community garden network opens its gates for tours, planting demos, and seed swaps. Meet your neighbors and learn urban growing techniques.",
      link: "https://www.portlandoregon.gov/parks/communitygarden",
    },
    {
      title: "Powell's Books — Author Reading & Signing",
      dayOffset: 5, time: "7:00 PM",
      venue: "Powell's Books, 1005 W Burnside St, Portland, OR",
      category: "Arts",
      description: "The world's largest independent bookstore hosts author readings every week. Free to attend — grab a coffee and settle in. Check website for this week's author.",
      link: "https://www.powells.com/events",
    },
    {
      title: "Portland Saturday Market",
      dayOffset: 6, time: "10:00 AM",
      venue: "2 SW Naito Pkwy, Portland, OR 97204",
      category: "Food & Markets",
      description: "America's largest continually operating outdoor arts and crafts market. 250+ local artists, food vendors, live music, and the iconic Skidmore Fountain. A Portland institution.",
      link: "https://portlandsaturdaymarket.com",
    },
    {
      title: "Portland Farmers Market at PSU",
      dayOffset: 7, time: "8:30 AM",
      venue: "South Park Blocks, Portland State University, Portland, OR",
      category: "Food & Markets",
      description: "Oregon's premier farmers market with 200+ vendors. Local farms, food artisans, prepared foods, live music, and cooking demos. Best coffee in the city.",
      link: "https://www.portlandfarmersmarket.org",
    },
    {
      title: "Portland Sunday Parkways — Open Streets",
      dayOffset: 8, time: "11:00 AM",
      venue: "SE Division St & SE 50th Ave, Portland, OR",
      category: "Wellness",
      description: "Portland closes streets to cars for 8+ miles of open roads, neighborhood stops, live music, food carts, and community activities. Free for everyone.",
      link: "https://www.portlandoregon.gov/transportation/sunparkways",
    },
    {
      title: "Portland Tech Meetup — Climate & Clean Energy",
      dayOffset: 10, time: "6:00 PM",
      venue: "CENTRL Office, 1355 NW Everett St, Portland, OR",
      category: "Tech",
      description: "Portland's tech community discusses local innovation in climate tech. Lightning talks, networking, and a panel of Oregon-based founders. Free to attend.",
      link: "https://www.meetup.com/portland-tech/",
    },
    {
      title: "First Thursday Art Walk — Pearl District",
      dayOffset: 11, time: "5:00 PM",
      venue: "Pearl District Galleries, NW 13th Ave, Portland, OR",
      category: "Arts",
      description: "Portland's beloved monthly art walk where Pearl District galleries open their doors for free. New exhibitions, artist meet-and-greets, 20+ galleries.",
      link: "https://www.firstthursdayportland.com",
    },
  ],

  bulverde: [
    {
      title: "San Antonio River Walk — Evening Stroll",
      dayOffset: 5, time: "7:00 PM",
      venue: "San Antonio River Walk, Commerce St, San Antonio, TX",
      category: "Wellness",
      description: "Take in the lights along one of Texas's most iconic urban spaces. Dozens of restaurants, live music, and boat tours. Free to walk anytime.",
      link: "https://www.thesanantonioriverwalk.com",
    },
    {
      title: "The Pearl Farmers Market",
      dayOffset: 6, time: "9:00 AM",
      venue: "Pearl Brewery, 200 E Grayson St, San Antonio, TX",
      category: "Food & Markets",
      description: "San Antonio's premier farmers market at the historic Pearl Brewery. Local farms, artisan food producers, live music, and the best breakfast tacos in Texas.",
      link: "https://atpearl.com/events/",
    },
    {
      title: "Bulverde Community Market",
      dayOffset: 6, time: "8:00 AM",
      venue: "Bulverde Village Shopping Center, Hwy 281 & Spring Branson Rd, Bulverde, TX",
      category: "Food & Markets",
      description: "Your local Saturday morning market with Hill Country farms, homemade jams, Texas honey, and local artisans. A community staple — bring the kids and dogs.",
      link: "https://www.bulverdetx.gov",
    },
    {
      title: "San Antonio Museum of Art — Free Family Sunday",
      dayOffset: 8, time: "10:00 AM",
      venue: "San Antonio Museum of Art, 200 W Jones Ave, San Antonio, TX",
      category: "Arts",
      description: "SAMA opens free to all San Antonio residents every Sunday. World-class collection including the largest Greek, Roman, and Egyptian art collection in the southern US.",
      link: "https://www.samuseum.org",
    },
    {
      title: "Comal County Civic Forum — Community Q&A",
      dayOffset: 9, time: "6:30 PM",
      venue: "Bulverde Community Center, 30360 Cougar Bend, Bulverde, TX",
      category: "Civics",
      description: "Local leaders and residents gather for an open Q&A on Bulverde's growth, infrastructure, and parks plans. Your chance to shape the future of your community.",
      link: "https://www.bulverdetx.gov",
    },
    {
      title: "La Villita Arts Village — Night Market",
      dayOffset: 13, time: "6:00 PM",
      venue: "La Villita Historic Arts Village, 418 Villita St, San Antonio, TX",
      category: "Arts",
      description: "San Antonio's oldest neighborhood transforms into an evening market with 30+ local artists, live Tejano and jazz music, and handcrafted goods. Free to browse.",
      link: "https://www.lavillitasanantonio.com",
    },
    {
      title: "Geekdom — SA Tech & Startup Meetup",
      dayOffset: 11, time: "6:00 PM",
      venue: "Geekdom, 110 E Houston St, San Antonio, TX",
      category: "Tech",
      description: "San Antonio's tech community at Geekdom for demos, pitches, and networking. Founders, developers, and innovators from across the Hill Country. Free to attend.",
      link: "https://geekdom.com/events/",
    },
  ],

  stlouis: [
    {
      title: "Gateway Arch — Evening Riverfront Walk",
      dayOffset: 4, time: "6:30 PM",
      venue: "Gateway Arch National Park, St. Louis, MO",
      category: "Wellness",
      description: "Take in the Arch at golden hour and stroll the Mississippi riverfront. Free and open to all — one of the most iconic views in America. Tram rides available inside.",
      link: "https://www.nps.gov/jeff/index.htm",
    },
    {
      title: "St. Louis Art Museum (SLAM) — Free Admission",
      dayOffset: 5, time: "10:00 AM",
      venue: "1 Fine Arts Dr, Forest Park, St. Louis, MO",
      category: "Arts",
      description: "The Saint Louis Art Museum in Forest Park offers free general admission every day. World-class collection spanning 5,000 years — from Egyptian antiquities to contemporary art.",
      link: "https://www.slam.org",
    },
    {
      title: "City Museum After Dark",
      dayOffset: 5, time: "5:00 PM",
      venue: "750 N 16th St, St. Louis, MO 63103",
      category: "Arts",
      description: "St. Louis's legendary playground for adults — a multi-story wonder of reclaimed architecture, caves, slides, and a rooftop schoolbus. Unlike anything else in the world.",
      link: "https://citymuseum.org",
    },
    {
      title: "Soulard Farmers Market",
      dayOffset: 6, time: "8:00 AM",
      venue: "730 Carroll St, St. Louis, MO 63104",
      category: "Food & Markets",
      description: "One of the oldest farmers markets in the country. Fresh produce, local vendors, live music, and the best breakfast burritos in the city. A St. Louis institution.",
      link: "https://soulardmarket.com",
    },
    {
      title: "Laumeier Sculpture Park",
      dayOffset: 8, time: "10:00 AM",
      venue: "12580 Rott Rd, St. Louis, MO 63127",
      category: "Wellness",
      description: "Explore 105 acres of outdoor sculpture in one of the country's premier outdoor art museums. Free always — walk the trails, picnic on the lawn, discover monumental works.",
      link: "https://laumeier.org",
    },
    {
      title: "Tower Grove Farmers Market",
      dayOffset: 13, time: "8:00 AM",
      venue: "Tower Grove Park, 4256 Magnolia Ave, St. Louis, MO",
      category: "Food & Markets",
      description: "St. Louis's best-loved neighborhood farmers market inside Tower Grove Park. Local farms, specialty food vendors, artisan crafts, and live music every Saturday.",
      link: "https://www.tgmarket.org",
    },
    {
      title: "STL Tech Meetup — AI Tools for Local Business",
      dayOffset: 10, time: "6:30 PM",
      venue: "T-REX, 911 Washington Ave, St. Louis, MO 63101",
      category: "Tech",
      description: "St. Louis's tech community at T-REX startup hub for demos on practical AI tools. Lightning talks, networking, and drinks. Free — RSVP on Meetup.",
      link: "https://www.meetup.com/stl-tech/",
    },
  ],
};

// ── Tenant config ─────────────────────────────────────────────────────────────

interface TenantConfig {
  slug: string;
  tz: string;
  tmCity?: string; // override when city != TM search city
}

const TENANT_CONFIGS: TenantConfig[] = [
  { slug: "austincares", tz: "America/Chicago" },
  { slug: "sacramento",  tz: "America/Los_Angeles" },
  { slug: "portland",    tz: "America/Los_Angeles" },
  { slug: "bulverde",    tz: "America/Chicago", tmCity: "San Antonio, TX" },
  { slug: "stlouis",     tz: "America/Chicago" },
];

// ── Ticketmaster fetch (server-side, direct env access) ───────────────────────

const TM_CLASSIFICATIONS = ["Music", "Arts & Theatre", "Sports", "Family", "Miscellaneous"];

async function fetchTicketmaster(
  cityStr: string,
  tz: string,
  rangeStart: string,
  rangeEnd: string,
  nextWeekIso: string,
): Promise<EventItem[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY?.trim();
  if (!apiKey) return [];

  const [cityName, stateCode] = cityStr.split(",").map(s => s.trim());
  const allEvents: EventItem[] = [];
  const seen = new Set<string>();

  await Promise.allSettled(TM_CLASSIFICATIONS.map(async cls => {
    const params = new URLSearchParams({
      apikey: apiKey,
      city: cityName,
      size: "30",
      sort: "date,asc",
      classificationName: cls,
      startDateTime: rangeStart,
      endDateTime:   rangeEnd,
    });
    if (stateCode) params.set("stateCode", stateCode);

    try {
      const res = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events.json?${params}`,
        { signal: AbortSignal.timeout(10000) },
      );
      if (!res.ok) return;
      const data = await res.json() as any;
      if (data.fault) return;
      for (const ev of data._embedded?.events ?? []) {
        const startIso: string | undefined = ev.dates?.start?.dateTime
          || (ev.dates?.start?.localDate ? `${ev.dates.start.localDate}T19:00:00Z` : undefined);
        if (!startIso) continue;
        const venue = ev._embedded?.venues?.[0];
        const venueName = [venue?.name, venue?.city?.name || cityName].filter(Boolean).join(", ");
        const image = ev.images?.find((i: any) => i.ratio === "16_9" && (i.width || 0) > 500)?.url
          || ev.images?.[0]?.url || null;
        const key = ev.name.toLowerCase().replace(/\s+/g, "").substring(0, 40);
        if (seen.has(key)) continue;
        seen.add(key);
        const isFeatured = startIso >= nextWeekIso;
        allEvents.push({
          title:       ev.name.trim(),
          date:        formatTmDate(startIso, tz),
          venue:       venueName.substring(0, 120),
          description: ((ev.description || ev.info || `${ev.name} at ${venueName}`) as string).substring(0, 400),
          category:    guessCategory(`${ev.name} ${cls}`),
          link:        ev.url || null,
          imageUrl:    image,
          source:      "Ticketmaster",
          ...(isFeatured ? { featured: true } : {}),
        });
      }
    } catch {
      // ignore per-classification errors
    }
  }));

  return allEvents;
}

// ── Build community events for a specific week ────────────────────────────────

function buildCommunityEvents(slug: string, weekStart: Date, nextWeekStart: Date): EventItem[] {
  const defs = COMMUNITY_EVENTS[slug];
  if (!defs) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return defs
    .map(def => {
      const eventDate = new Date(weekStart);
      eventDate.setDate(weekStart.getDate() + def.dayOffset);
      // Skip events that have already passed
      if (eventDate < today) return null;

      const isFeatured = eventDate >= nextWeekStart;
      return {
        title:       def.title,
        date:        formatCommunityDate(weekStart, def.dayOffset, def.time),
        venue:       def.venue,
        description: def.description,
        category:    def.category,
        link:        def.link,
        imageUrl:    null,
        source:      "Community",
        ...(isFeatured ? { featured: true } : {}),
      } as EventItem;
    })
    .filter((e): e is EventItem => e !== null);
}

// ── Filter past events ────────────────────────────────────────────────────────

function filterPastEvents(events: EventItem[]): EventItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return events.filter(ev => {
    const d = parseDateString(ev.date);
    if (!d) return true; // can't parse → keep
    return d >= today;
  });
}

// ── Safety check: refuse to patch if new count is < 50% of existing ──────────

function safetyCheck(slug: string, existingCount: number, newCount: number): boolean {
  if (existingCount === 0) return true; // empty digest — always ok
  const ratio = newCount / existingCount;
  if (ratio < 0.5) {
    logger.warn(
      { slug, existingCount, newCount, ratio },
      "Weekly refresh ABORTED — new event count < 50% of existing (safety floor). Check data sources.",
    );
    return false;
  }
  return true;
}

// ── Refresh one tenant ────────────────────────────────────────────────────────

async function refreshTenant(
  config: TenantConfig,
  weekStart: Date,
  nextWeekStart: Date,
  rangeStart: string,
  rangeEnd: string,
  nextWeekIso: string,
): Promise<void> {
  const { slug, tz, tmCity } = config;

  // Look up tenant + most recent digest
  const [tenant] = await db
    .select({ id: tenantsTable.id, city: tenantsTable.city })
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, slug))
    .limit(1);

  if (!tenant) {
    logger.warn({ slug }, "Weekly refresh: tenant not found");
    return;
  }

  const [digest] = await db
    .select({ id: digestsTable.id, events: digestsTable.events })
    .from(digestsTable)
    .where(eq(digestsTable.tenantId, tenant.id))
    .orderBy(desc(digestsTable.weekOf))
    .limit(1);

  if (!digest) {
    logger.warn({ slug }, "Weekly refresh: no digest found");
    return;
  }

  const rawExisting = (digest.events as EventItem[]) || [];
  const existing = filterPastEvents(rawExisting);
  const dropped = rawExisting.length - existing.length;

  // Fetch TM events + build community events in parallel
  const searchCity = tmCity || tenant.city;
  const [tmEvents, communityEvents] = await Promise.all([
    fetchTicketmaster(searchCity, tz, rangeStart, rangeEnd, nextWeekIso),
    Promise.resolve(buildCommunityEvents(slug, weekStart, nextWeekStart)),
  ]);

  // Deduplicate: existing wins; community wins over TM for same title
  const seen = new Set(
    existing.map(e => e.title.toLowerCase().replace(/\s+/g, "").substring(0, 40)),
  );

  const toAddCommunity = communityEvents.filter(e => {
    const key = e.title.toLowerCase().replace(/\s+/g, "").substring(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const toAddTm = tmEvents.filter(e => {
    const key = e.title.toLowerCase().replace(/\s+/g, "").substring(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Re-tag any existing next-week events that aren't yet featured
  const updatedExisting = existing.map(ev => {
    const d = parseDateString(ev.date);
    if (d && d >= nextWeekStart && !ev.featured) return { ...ev, featured: true };
    return ev;
  });

  const merged = [...updatedExisting, ...toAddCommunity, ...toAddTm];

  if (!safetyCheck(slug, rawExisting.length, merged.length)) return;

  const changed = toAddCommunity.length > 0 || toAddTm.length > 0 || dropped > 0
    || JSON.stringify(existing) !== JSON.stringify(updatedExisting);

  if (!changed) {
    logger.info({ slug, total: merged.length }, "Weekly refresh: nothing changed");
    return;
  }

  await db
    .update(digestsTable)
    .set({ events: merged as any })
    .where(eq(digestsTable.id, digest.id));

  logger.info(
    { slug, digestId: digest.id, total: merged.length, addedCommunity: toAddCommunity.length, addedTm: toAddTm.length, dropped },
    "Weekly refresh: digest updated",
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function runWeeklyRefresh(): Promise<void> {
  logger.info("Weekly digest refresh: starting");

  const weekStart    = currentWeekStart();
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(weekStart.getDate() + 7);
  const twoWeeksEnd  = new Date(weekStart);
  twoWeeksEnd.setDate(weekStart.getDate() + 13);

  const rangeStart = weekStart.toISOString().replace(".000Z", "Z");
  const rangeEnd   = new Date(twoWeeksEnd.getTime() + 86399000).toISOString().replace(".000Z", "Z");
  const nextWeekIso = nextWeekStart.toISOString().substring(0, 10);

  for (const config of TENANT_CONFIGS) {
    try {
      await refreshTenant(config, weekStart, nextWeekStart, rangeStart, rangeEnd, nextWeekIso);
    } catch (err) {
      logger.warn({ err, slug: config.slug }, "Weekly refresh: tenant failed (non-fatal)");
    }
  }

  logger.info("Weekly digest refresh: complete");
}

export function scheduleWeeklyRefresh(): void {
  function msUntilSundayEvening(): number {
    const now = new Date();
    // Target: this coming Sunday at 18:00 server time
    const target = new Date(now);
    const daysUntilSun = (7 - now.getDay()) % 7;
    target.setDate(now.getDate() + (daysUntilSun === 0 ? 7 : daysUntilSun));
    target.setHours(18, 0, 0, 0);
    // If we're already past today's Sunday 6 PM window, schedule for next Sunday
    if (target <= now) target.setDate(target.getDate() + 7);
    return Math.max(target.getTime() - now.getTime(), 60_000);
  }

  function scheduleNext(): void {
    const delay = msUntilSundayEvening();
    const nextRun = new Date(Date.now() + delay);
    logger.info({ nextRun: nextRun.toISOString() }, "Weekly digest refresh scheduled");

    setTimeout(async () => {
      await runWeeklyRefresh();
      scheduleNext();
    }, delay);
  }

  scheduleNext();
  logger.info("Weekly digest refresh scheduler started (runs every Sunday at 6 PM)");
}
