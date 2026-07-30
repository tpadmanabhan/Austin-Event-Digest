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

export function generateSampleDigest(weekOf?: Date, customNotes?: string): GeneratedDigest {
  const targetWeek = weekOf || getNextSunday();
  const dateRange = formatDateRange(targetWeek);

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
  
  const intro = customNotes
    ? `Happy Sunday, Austin! Here's Raj's curated guide to the best events happening in Austin this week.\n\n${customNotes}\n\nAs always, get out there and enjoy this amazing city! 🤠`
    : `Happy Sunday, Austin! Here's your weekly roundup of the best events happening in our city this week.\n\nWe've got an incredible mix — live music, outdoor adventures, arts and culture, and of course great food. Austin never disappoints, and this week is no exception. Get out there and enjoy it!`;

  return {
    subject: `🤠 Raj's Austin Events — Week of ${dateRange}`,
    intro,
    events: SAMPLE_EVENTS,
  };
}

export function getStLouisSampleDigest(dateRange: string): { subject: string; intro: string; events: typeof SAMPLE_EVENTS } {
  return {
    subject: `⚾ Phil's St. Louis Events — Week of ${dateRange}`,
    intro: `Hey St. Louis! With the help of AI, I combed through various event newsletters and hand-picked some cool events happening around the city this week. Here's your curated digest — get out there and enjoy St. Louis! Let's Go Redbirds! 🔴`,
    events: SAMPLE_EVENTS,
  };
}

export { getNextSunday };
