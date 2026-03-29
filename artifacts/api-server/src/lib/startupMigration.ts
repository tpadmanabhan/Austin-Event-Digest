import { db, digestsTable } from "@workspace/db";
import { eq, and, lt, gte } from "drizzle-orm";
import { logger } from "./logger";

const PAST_WEEKS = [
  {
    weekOf: new Date("2026-03-22T00:00:00.000Z"),
    subject: "🤠 Raj's Austin Events — Week of March 22–28, 2026",
    intro: `Happy Sunday, Austin! Here's your weekly roundup of the best events happening in our city the week of March 22–28, 2026.\n\nAustin was in full swing this week — from live music on 6th Street to packed farmers markets and outdoor adventures. Whether you're a long-time local or new to town, there's always something incredible going on. Get out there and enjoy it!`,
    events: [
      {
        title: "SXSW Wrap-Up: Local Showcase at Stubb's",
        date: "Monday, Mar 23 at 7:00 PM",
        venue: "Stubb's Outdoor Amphitheater, 801 Red River St",
        description: "Austin's best local acts take the stage for one final post-SXSW celebration. No badge required — just your love of live music.",
        link: null,
        category: "Music",
        imageUrl: null,
      },
      {
        title: "Barton Creek Greenbelt Trail Run",
        date: "Saturday, Mar 28 at 8:00 AM",
        venue: "Barton Creek Greenbelt, Austin, TX",
        description: "Join hundreds of Austin runners on one of the most scenic trail systems in Texas. All paces welcome — bring water and good vibes.",
        link: null,
        category: "Outdoors",
        imageUrl: null,
      },
      {
        title: "Mueller Farmers Market",
        date: "Sunday, Mar 22 at 10:00 AM",
        venue: "Mueller Lake Park, 4550 Mueller Blvd",
        description: "One of Austin's most beloved weekly markets. Local produce, artisan foods, live music, and the best breakfast tacos you'll find anywhere.",
        link: null,
        category: "Food & Markets",
        imageUrl: null,
      },
      {
        title: "Austin Film Society: Texas Directors Night",
        date: "Wednesday, Mar 25 at 7:30 PM",
        venue: "Violet Crown Cinema, 434 W 2nd St",
        description: "A special program celebrating Texas-based filmmakers with short films, Q&As, and a reception. Tickets include one drink.",
        link: null,
        category: "Arts & Culture",
        imageUrl: null,
      },
    ],
  },
  {
    weekOf: new Date("2026-03-15T00:00:00.000Z"),
    subject: "🤠 Raj's Austin Events — Week of March 15–21, 2026",
    intro: `Happy Sunday, Austin! Here's your curated guide to the best events the week of March 15–21, 2026.\n\nWith SXSW in the air, the whole city was electric this week. Even beyond the badge holders, Austin had something for everyone — from free outdoor concerts to art installations and incredible food. This is why we live here.`,
    events: [
      {
        title: "SXSW Interactive: Future of AI Panel",
        date: "Monday, Mar 16 at 2:00 PM",
        venue: "Austin Convention Center, 500 E Cesar Chavez St",
        description: "Top voices in AI discuss the near future of machine intelligence, creative tools, and what it means for how we work and create.",
        link: null,
        category: "Tech & Business",
        imageUrl: null,
      },
      {
        title: "Rainey Street Block Party",
        date: "Saturday, Mar 21 at 4:00 PM",
        venue: "Rainey Street, Austin, TX",
        description: "Austin's liveliest bar district closes its street to cars for a massive outdoor party. Multiple stages, food trucks, and the full Rainey Street experience.",
        link: null,
        category: "Music",
        imageUrl: null,
      },
      {
        title: "Austin Nature & Science Center Family Day",
        date: "Sunday, Mar 15 at 10:00 AM",
        venue: "Austin Nature & Science Center, 2389 Stratford Dr",
        description: "Free family programming with live animals, hands-on science exhibits, and guided nature walks. Perfect for all ages.",
        link: null,
        category: "Family",
        imageUrl: null,
      },
      {
        title: "6th Street Live Music Crawl",
        date: "Friday, Mar 20 at 8:00 PM",
        venue: "East 6th Street, Austin, TX",
        description: "A self-guided tour of Austin's legendary live music strip. Multiple venues, multiple genres — blues, country, rock, jazz — all free to wander.",
        link: null,
        category: "Music",
        imageUrl: null,
      },
    ],
  },
  {
    weekOf: new Date("2026-03-08T00:00:00.000Z"),
    subject: "🤠 Raj's Austin Events — Week of March 8–14, 2026",
    intro: `Happy Sunday, Austin! Your weekly digest of the city's best events for March 8–14, 2026 is here.\n\nSpring is arriving in Austin and the city is bursting with energy. The warm weather brought everyone outdoors, and local venues were packed with incredible performances. Here's what you shouldn't have missed (and what's still coming!).`,
    events: [
      {
        title: "Blanton Museum: Texas Contemporary Art Opening",
        date: "Thursday, Mar 12 at 6:00 PM",
        venue: "Blanton Museum of Art, 200 E Martin Luther King Jr Blvd",
        description: "Opening reception for a new exhibition showcasing the best of contemporary Texas art. Free for UT students, $12 general admission.",
        link: null,
        category: "Arts & Culture",
        imageUrl: null,
      },
      {
        title: "Austin Bouldering Project Beginner Clinic",
        date: "Saturday, Mar 14 at 11:00 AM",
        venue: "Austin Bouldering Project, 979 Springdale Rd",
        description: "New to climbing? This free intro clinic covers the basics of bouldering technique and safety. All gear provided, no experience needed.",
        link: null,
        category: "Outdoors",
        imageUrl: null,
      },
      {
        title: "Hope Outdoor Gallery Community Paint Day",
        date: "Sunday, Mar 8 at 12:00 PM",
        venue: "Hope Outdoor Gallery, 7901 N Lamar Blvd",
        description: "Austin's beloved outdoor street art gallery opens its walls to the public. Bring your own paint or pick some up on-site. All skill levels welcome.",
        link: null,
        category: "Arts & Culture",
        imageUrl: null,
      },
      {
        title: "Austin Food & Wine Festival Kickoff",
        date: "Friday, Mar 13 at 5:00 PM",
        venue: "Republic Square, 422 W 2nd St",
        description: "The beloved annual food festival opens with a free outdoor kickoff event featuring local chefs, live music, and plenty of Texas bites.",
        link: null,
        category: "Food & Drink",
        imageUrl: null,
      },
    ],
  },
];

export async function runStartupMigration(): Promise<void> {
  try {
    // Fix digest with wrong future week_of date (April 5 should be March 29)
    const wrongDate = new Date("2026-04-05T00:00:00.000Z");
    const correctDate = new Date("2026-03-29T00:00:00.000Z");

    const wrongDigests = await db
      .select()
      .from(digestsTable)
      .where(eq(digestsTable.weekOf, wrongDate));

    if (wrongDigests.length > 0) {
      await db
        .update(digestsTable)
        .set({
          weekOf: correctDate,
          subject: "🤠 Raj's Austin Events — Week of March 29–April 4, 2026",
        })
        .where(eq(digestsTable.weekOf, wrongDate));
      logger.info("Migration: fixed digest week_of from April 5 to March 29");
    }

    // Seed past week digests if they don't exist
    for (const week of PAST_WEEKS) {
      const existing = await db
        .select({ id: digestsTable.id })
        .from(digestsTable)
        .where(eq(digestsTable.weekOf, week.weekOf));

      if (existing.length === 0) {
        await db.insert(digestsTable).values({
          weekOf: week.weekOf,
          subject: week.subject,
          intro: week.intro,
          events: week.events,
          sentCount: 0,
        });
        logger.info({ weekOf: week.weekOf }, "Migration: seeded past digest");
      }
    }
  } catch (err) {
    logger.warn({ err }, "Startup migration failed (non-fatal)");
  }
}
