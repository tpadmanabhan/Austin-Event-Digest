import { EventItem } from "@workspace/db";

interface GeneratedDigest {
  subject: string;
  intro: string;
  events: EventItem[];
}

function getNextSunday(from: Date = new Date()): Date {
  const d = new Date(from);
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getNextSaturday(from: Date = new Date()): Date {
  const d = new Date(from);
  const day = d.getDay();
  const diff = day === 6 ? 0 : 6 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateRange(weekOf: Date): string {
  const start = new Date(weekOf);
  const end = new Date(weekOf);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString("en-US", { month: "long", day: "numeric" })}–${end.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
}

function weekDay(weekOf: Date, offset: number, time: string): string {
  const d = new Date(weekOf);
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) + ` at ${time}`;
}

export function generateSampleDigest(weekOf?: Date, customNotes?: string, tenant?: { slug?: string | null; city?: string | null; digestTitle?: string | null }): GeneratedDigest {
  const targetWeek = weekOf || getNextSunday();
  const dateRange = formatDateRange(targetWeek);
  const slug = tenant?.slug ?? "austin";
  const cityFirst = tenant?.city?.split(",")[0] || "Austin";
  const digestName = tenant?.digestTitle || tenant?.city || "Austin";

  const SAMPLE_EVENTS: EventItem[] = [
    {
      title: "Barton Springs Sunday Swim",
      date: weekDay(targetWeek, 0, "8:00 AM"),
      venue: "Barton Springs Pool, Zilker Park",
      description: "Kick off the week with a swim in Austin's legendary spring-fed pool. 68°F year-round, free before 8 AM. The best way to start a Sunday.",
      link: "https://austintexas.gov/department/barton-springs-pool",
      category: "Outdoors & Fitness",
      imageUrl: null,
    },
    {
      title: "South Congress Farmers Market",
      date: weekDay(targetWeek, 0, "9:00 AM"),
      venue: "South Congress Ave, Austin, TX",
      description: "Fresh local produce, artisan goods, live music, and the best breakfast tacos you'll find. A beloved Austin Sunday tradition.",
      link: null,
      category: "Food & Markets",
      imageUrl: null,
    },
    {
      title: "Alamo Drafthouse: Weird Wednesday Film Series",
      date: weekDay(targetWeek, 3, "10:00 PM"),
      venue: "Alamo Drafthouse South Lamar, 1120 S Lamar Blvd",
      description: "Austin's cult midnight movie series. Deep cuts, strange cinema, food and drinks at your seat. This week's pick is a surprise — just show up.",
      link: "https://drafthouse.com/austin",
      category: "Arts & Culture",
      imageUrl: null,
    },
    {
      title: "Austin City Limits Live: Local Music Night",
      date: weekDay(targetWeek, 6, "8:00 PM"),
      venue: "ACL Live at the Moody Center, 310 W Willie Nelson Blvd",
      description: "An incredible evening showcasing the best local Austin musicians — from blues to indie folk to Texas country. This is what Austin is all about.",
      link: "https://acl-live.com",
      category: "Music",
      imageUrl: null,
    },
    {
      title: "East Austin Studio Tour",
      date: weekDay(targetWeek, 5, "6:00 PM"),
      venue: "Various East Austin Locations",
      description: "Get a first look at EAST (East Austin Studio Tour) with over 200 artists opening their studios. Free, family-friendly, one of Austin's coolest traditions.",
      link: "https://east.bigmedium.org",
      category: "Arts & Culture",
      imageUrl: null,
    },
  ];
  
  const cityIntro = customNotes
    ? `Hey ${cityFirst}! Here's your curated guide to the best events happening this week.\n\n${customNotes}\n\nGet out there and enjoy ${cityFirst}!`
    : `Hey ${cityFirst}! Here's your weekly roundup of the best events happening in our city this week.\n\nWe've got an incredible mix — live music, outdoor adventures, arts and culture, and of course great food. Get out there and enjoy it!`;
  const intro = cityIntro;

  const subjectEmoji = slug === "austincares" ? "🏷️" : slug === "stlouis" ? "⚾" : slug === "sacramento" ? "👑" : slug === "portland" ? "🌲" : slug === "bulverde" || slug === "brushycreek" ? "🌿" : slug === "tokyo" ? "🗼" : slug === "dc" ? "🏛️" : "🤠";

  return {
    subject: `${subjectEmoji} ${digestName} Events — Week of ${dateRange}`,
    intro,
    events: SAMPLE_EVENTS,
  };
}

export function getStLouisSampleDigest(dateRange: string): { subject: string; intro: string; events: EventItem[] } {
  const STL_SAMPLE_EVENTS: EventItem[] = [
    {
      title: "Gateway Arch Sunrise Hike",
      date: "Sunday at 6:30 AM",
      venue: "Gateway Arch National Park, St. Louis, MO",
      description: "Start your week with a sunrise walk along the Mississippi riverfront and take in the Arch at golden hour. Free and open to all — one of St. Louis's most iconic views.",
      link: "https://www.nps.gov/jeff/index.htm",
      category: "Outdoors & Fitness",
      imageUrl: null,
    },
    {
      title: "Soulard Farmers Market",
      date: "Saturday at 8:00 AM",
      venue: "730 Carroll St, St. Louis, MO 63104",
      description: "One of the oldest farmers markets in the country. Fresh produce, local vendors, live music, and the best breakfast burritos in the city. A St. Louis Saturday institution.",
      link: "https://soulardmarket.com",
      category: "Food & Markets",
      imageUrl: null,
    },
    {
      title: "St. Louis Art Museum: Free Admission",
      date: "Tuesday at 10:00 AM",
      venue: "1 Fine Arts Dr, Forest Park, St. Louis, MO",
      description: "The Saint Louis Art Museum in Forest Park offers free general admission every day. World-class collection spanning 5,000 years — from Egyptian antiquities to contemporary art.",
      link: "https://www.slam.org",
      category: "Arts & Culture",
      imageUrl: null,
    },
    {
      title: "City Museum After Dark",
      date: "Friday at 5:00 PM",
      venue: "750 N 16th St, St. Louis, MO 63103",
      description: "St. Louis's legendary playground for adults — a multi-story wonder of reclaimed architecture, caves, slides, and rooftop schoolbus. Unlike anything else in the world.",
      link: "https://citymuseum.org",
      category: "Arts & Culture",
      imageUrl: null,
    },
    {
      title: "Ballpark Village Live!",
      date: "Saturday at 7:00 PM",
      venue: "601 Clark Ave, St. Louis, MO 63102",
      description: "Right next to Busch Stadium — live music, craft beer, and the best Cardinals pregame energy in the city. Free to enter, great views of the Arch.",
      link: "https://www.stlballparkvillage.com",
      category: "Music",
      imageUrl: null,
    },
  ];

  return {
    subject: `⚾ Phil's St. Louis Events — Week of ${dateRange}`,
    intro: `Hey St. Louis! With the help of AI, I combed through various event newsletters and hand-picked some cool events happening around the city this week. Here's your curated digest — get out there and enjoy St. Louis! Let's Go Redbirds! 🔴`,
    events: STL_SAMPLE_EVENTS,
  };
}

export { getNextSunday };
