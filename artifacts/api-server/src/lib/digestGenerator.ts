import { EventItem } from "@workspace/db";

interface GeneratedDigest {
  subject: string;
  intro: string;
  events: EventItem[];
}

function getNextSunday(from: Date = new Date()): Date {
  const d = new Date(from);
  const day = d.getDay();
  const diff = day === 0 ? 7 : 7 - day;
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

const SAMPLE_EVENTS: EventItem[] = [
  {
    title: "Austin City Limits Live Presents: Local Music Night",
    date: "Saturday, 8:00 PM",
    venue: "ACL Live at the Moody Center, 310 W Willie Nelson Blvd",
    description: "An incredible evening showcasing the best local Austin musicians across multiple genres — from blues to indie folk to Texas country. This is what Austin is all about.",
    link: "https://acl-live.com",
    category: "Music",
    imageUrl: null,
  },
  {
    title: "South Congress Farmers Market",
    date: "Sunday, 9:00 AM – 1:00 PM",
    venue: "South Congress Ave, Austin, TX",
    description: "The best farmers market in Austin returns this Sunday with fresh local produce, artisan goods, live music, and the most incredible breakfast tacos you'll ever have. Don't miss it!",
    link: null,
    category: "Food & Markets",
    imageUrl: null,
  },
  {
    title: "Barton Springs Open Swim & Yoga",
    date: "Every Morning, 7:00 AM",
    venue: "Barton Springs Pool, Zilker Park",
    description: "Beat the Texas heat (or enjoy a crisp morning) at the legendary Barton Springs Pool. Natural spring-fed, 68°F year-round. Outdoor yoga classes available on the surrounding lawn.",
    link: "https://austintexas.gov/department/barton-springs-pool",
    category: "Outdoors",
    imageUrl: null,
  },
  {
    title: "Alamo Drafthouse: Weird Wednesday Film Series",
    date: "Wednesday, 10:00 PM",
    venue: "Alamo Drafthouse South Lamar, 1120 S Lamar Blvd",
    description: "Austin's cult-classic midnight movie series features deep cuts and strange cinema with food and drinks served at your seat. This week's pick is a surprise — just show up.",
    link: "https://drafthouse.com/austin",
    category: "Arts & Culture",
    imageUrl: null,
  },
  {
    title: "East Austin Studio Tour Preview Night",
    date: "Friday, 6:00 PM – 9:00 PM",
    venue: "Various East Austin Locations",
    description: "Get a first look at the annual EAST (East Austin Studio Tour) with over 200 artists opening their studios. Free, family-friendly, and one of the coolest Austin traditions around.",
    link: "https://east.bigmedium.org",
    category: "Arts & Culture",
    imageUrl: null,
  },
];

export function generateSampleDigest(weekOf?: Date, customNotes?: string): GeneratedDigest {
  const targetWeek = weekOf || getNextSunday();
  const dateRange = formatDateRange(targetWeek);
  
  const intro = customNotes
    ? `Happy Sunday, Austin! Here's Raj's curated guide to the best events happening in Austin the week of ${dateRange}.\n\n${customNotes}\n\nAs always, get out there and enjoy this amazing city! 🤠`
    : `Happy Sunday, Austin! Here's your weekly roundup of the best events happening in our city the week of ${dateRange}.\n\nWe've got an incredible mix this week — live music, outdoor adventures, arts and culture, and of course great food. Austin never disappoints, and this week is no exception. Get out there and enjoy it!`;

  return {
    subject: `🤠 Raj's Austin Events — Week of ${dateRange}`,
    intro,
    events: SAMPLE_EVENTS,
  };
}

export { getNextSunday };
