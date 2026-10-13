// Curated from the linked organizer calendars on October 12, 2026.
// All scheduled entries fall within October 13–31 in America/Los_Angeles.
// No registration, attendance, availability or transport is guaranteed.
const timezone = "America/Los_Angeles";
const arena = "Golden 1 Center";
const arenaAddress = "500 David J Stern Walk, Sacramento, CA 95814";
const cityHallAddress = "915 I Street, Sacramento, CA 95814";
const event = (title, category, day, time, venue, venueAddress, link, description, endTime) => {
  const startDate = `2026-10-${String(day).padStart(2, "0")}T${time}:00-07:00`;
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, weekday: "long", month: "short", day: "numeric",
  }).format(new Date(startDate));
  const clock = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, hour: "numeric", minute: "2-digit",
  }).format(new Date(startDate));
  return {
    title, category, date: `${date} at ${clock} PDT`, venue,
    ...(venueAddress ? { venueAddress } : {}),
    link, description, source: "Organizer calendar", featured: false,
    startDate, timezone,
    ...(endTime ? { endDate: `2026-10-${String(day).padStart(2, "0")}T${endTime}:00-07:00` } : {}),
  };
};
const sports = (title, day, time, slug, description) =>
  event(title, "Sports", day, time, arena, arenaAddress, `https://www.golden1center.com/events/detail/${slug}/`, description);
const meeting = (title, day, time) =>
  event(title, "Civics", day, time, "Sacramento City Hall", cityHallAddress,
    "https://sacramento.legistar.com/Calendar.aspx",
    "Attend a public meeting listed on the City of Sacramento's calendar. Check the official calendar for the agenda, public-comment instructions and any schedule changes; future agendas may not yet be posted.");

const events = [
  event("SEA Mastermind: AI to Grow Your Business", "Tech", 14, "17:30", "Aggie Square Event Center", "4480 2nd Avenue, Sacramento, CA 95817", "https://cerebros-event-registration.vercel.app/events/mastermind-0917", "An interactive AI experience, an entrepreneurial panel and small-group networking with Sacramento Entrepreneurship Academy alumni and business leaders. Registration required; attendance is limited by design.", "19:30"),
  event("Harnesses: How an AI-Native Company Actually Runs", "Tech", 15, "17:30", "HUMANBULB Innovation Center", "1375 Exposition Boulevard, Suite 102, Sacramento, CA 95815", "https://luma.com/humanbulb-9opj", "Watch Pat Santora build the instructions, gates and hooks that keep AI agents on track, then build your own starter harness. Bring a laptop with a working coding agent and clone the organizer's starter repository. Doors and setup at 5:30 PM; workshop starts at 6 PM.", "20:00"),
  event("Sac Tech Week: State of Innovation Kickoff Breakfast", "Tech", 19, "09:00", "1442 on the Blvd", "1442 Del Paso Boulevard, Sacramento, CA 95815", "https://luma.com/j9jspm0p", "Founders, investors and civic leaders discuss AI, the future of work, energy infrastructure and Sacramento's innovation economy. Choose a ticket through the organizer.", "12:00"),
  event("Startup World Cup Sacramento Regional", "Tech", 20, "17:30", "Carlsen Center for Innovation & Entrepreneurship", "6000 J Street, Library 1520, Sacramento, CA 95819", "https://luma.com/31cagcl7", "Watch ten regional startups pitch live for local prizes and a place in the global competition. Free and open to the public; registration is required and capacity is limited.", "20:00"),
  event("Sac Tech Week: Prototype — Building Your New Coworker", "Tech", 21, "11:00", "Frequency Coworking & Events, Rancho Cordova", "3249 Quality Drive, Rancho Cordova, CA 95670", "https://luma.com/rbhk3qa7", "A hands-on AI mini summit in Greater Sacramento: build a Claude-powered business copilot, automate a workflow, and use Replit to create a practical business tool. Register with the organizer.", "15:00"),
  event("Tandem: A Human-First Tech Summit", "Tech", 24, "09:00", "Sacramento — exact location provided after registration", "", "https://luma.com/qerdn7wo", "A Sac Tech Week summit exploring AI, work, creativity, robotics, climate and the human impact of emerging technology. The organizer requires registration to disclose the exact address; choose a ticket on its page.", "17:00"),
  event("Water for Elephants — Opening Night", "Arts", 13, "19:30", "SAFE Credit Union Performing Arts Center", "1301 L Street, Sacramento, CA 95814", "https://www.broadwaysacramento.com/production/water-for-elephants/", "The touring Broadway musical opens its Sacramento run with circus artistry and a story of finding a new home. Buy tickets from Broadway Sacramento and review its age and content guidance."),
  event("Monoprinting Made Easy", "Arts", 15, "18:00", "Crocker Art Museum", "216 O Street, Sacramento, CA 95814", "https://www.crockerart.org/events/4866/monoprinting-made-easy", "Explore simple printmaking using press and rubbing techniques in this museum studio class for ages 18+. Listed price: $55 members, $70 nonmembers. Register through the museum.", "20:00"),
  event("Gladys Goes to the Movies: Arsenic and Old Lace", "Arts", 15, "18:30", "Crocker Art Museum", "216 O Street, Sacramento, CA 95814", "https://www.crockerart.org/events/4994/gladys-goes-to-the-movies-arsenic-and-old-lace-1944", "Watch the 1944 classic in a film program inspired by artist Gladys Nilsson. Listed price: $8 members, $16 nonmembers. Check the museum page for admission and registration.", "20:30"),
  event("Los Inquietos Del Norte, Gerardo Ortiz & Luis Angel El Flaco", "Arts", 17, "20:00", arena, arenaAddress, "https://www.golden1center.com/events/detail/los-inquietos-del-norte-gerardo-ortiz-los-farmerz/", "A regional Mexican music concert at Golden 1 Center. Confirm the current lineup, tickets and venue policies on the official event page."),
  event("Doja Cat", "Arts", 20, "19:30", arena, arenaAddress, "https://www.golden1center.com/events/detail/doja-cat/", "Doja Cat brings her live show to downtown Sacramento. Use Golden 1 Center's official page for tickets and entry policies."),
  ...[[29, "19:00"], [30, "19:00"], [31, "10:30"], [31, "14:30"]].map(([day, time]) =>
    event("Disney On Ice presents Find Your Hero", "Arts", day, time, arena, arenaAddress, "https://www.golden1center.com/events/detail/disney-on-ice-presents-find-your-hero/", "A family figure-skating show featuring Disney characters, costumes and stories of heroism. This listing is for the specified performance; select the matching date and time when buying tickets.")),
  sports("Kings vs. Trail Blazers — Preseason", 13, "19:00", "trail-blazers-vs-kings-101326", "Sacramento hosts Portland in a preseason game. Tickets and venue information are available through Golden 1 Center."),
  sports("Sacramento Kings Fan Fest", 14, "18:00", "kings-fan-fest-2026", "A free Kings fan event presented by Sutter Health. A ticket reservation is required; doors open at 4:30 PM."),
  sports("WWE SmackDown", 16, "16:30", "wwe-2026", "WWE returns to Golden 1 Center. Check the official page for the live start time, tickets and venue entry rules."),
  sports("Kings vs. Trail Blazers — Opening Night", 23, "19:00", "trail-blazers-vs-kings-102326", "Sacramento's home opening night against Portland at Golden 1 Center. Confirm ticket availability with the official venue."),
  sports("Kings vs. Grizzlies", 25, "18:00", "grizzlies-vs-kings-102526", "Sunday evening basketball as the Kings host Memphis. Use the official venue page for tickets and entry details."),
  meeting("Sacramento City Council — Evening Session", 13, "17:00"),
  meeting("Animal Wellbeing Commission", 14, "17:30"),
  meeting("Active Transportation Commission", 15, "17:30"),
  meeting("Measure U Community Advisory Commission", 19, "17:30"),
  meeting("Sacramento City Council — Evening Session", 20, "17:00"),
  meeting("Preservation Commission", 21, "17:30"),
  meeting("Planning and Design Commission", 22, "17:30"),
  meeting("Ethics Commission", 26, "17:30"),
  meeting("Sacramento City Council — Evening Session", 27, "17:00"),
  event("Women's Wellness Circle", "Wellness", 14, "18:00", "Yoga Shala Arden", "4397 Arden Way, Sacramento, CA 95864", "https://www.yogashalasac.com/events/womens-wellness-circle", "A supportive women's gathering with meditation, discussion, breathwork and somatic movement. Gather and mingle at 6 PM; the circle begins at 6:30 PM. Listed price: $30. Register with Yoga Shala.", "20:00"),
  event("Awaken Your Hips", "Wellness", 18, "13:30", "Yoga Shala Midtown", "2030 H Street, Sacramento, CA 95811", "https://www.yogashalasac.com/events/free-your-neck-shoulders-wm93g", "Bella Dreizler leads an all-levels workshop on hip anatomy, mobility and stability through yoga and physical therapy. Listed price: $55. Bring your rollers or balls if you have them; register with the studio.", "16:00"),
].sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate));

// Coordinates published in the organizers' Event JSON-LD, not name-only geocoding.
for (const item of events) {
  const location = {
    "https://luma.com/humanbulb-9opj": [38.5964471, -121.4394018],
    "https://luma.com/j9jspm0p": [38.6058303, -121.4592379],
    "https://luma.com/rbhk3qa7": [38.5854091, -121.2889144],
  }[item.link];
  if (location) [item.lat, item.lng] = location;
  if (item.link === "https://luma.com/qerdn7wo") {
    item.lat = null;
    item.lng = null; // Do not place an exact venue pin for a registration-only address.
  }
}

const spotlights = [
  {
    title: "Beers Books", category: "Arts", date: "Local business spotlight",
    venue: "Beers Books, 712 R Street, Sacramento, CA", venueAddress: "712 R Street, Sacramento, CA",
    description: "A family-owned Sacramento bookstore offering new, used and rare books. Browse in person at 712 R Street; the store lists daily hours of 11 AM–7 PM. Check its website before visiting or arranging to sell books.",
    link: "https://beersbooks.com/", source: "Business website",
    isBusinessSpotlight: true, featured: false,
  },
  {
    title: "Sacramento Food Bank & Family Services", category: "Civics", date: "Community spotlight",
    venue: "Sacramento Food Bank & Family Services",
    description: "Support Sacramento neighbors through food assistance and volunteer service. Volunteers inspect, sort, repack and distribute food. Choose an available shift on the official calendar, review age and eligibility requirements, and wear fully closed-toe shoes. Shift availability changes.",
    link: "https://www.sacramentofoodbank.org/volunteer", source: "Nonprofit website",
    imageUrl: "https://images.squarespace-cdn.com/content/v1/652057f4390ef75973cff590/5bf44447-2a81-4068-98a0-4954b3fd5166/20230613_ts_sacramento_0068.jpg",
    isPost: true, featured: false,
  },
];

export const digest = {
  weekOf: "2026-10-13",
  subject: "Sacramento Events — October 13 – October 31, 2026",
  intro: "Hey Sacramento! Here is your October 13–31 edition across Tech, Arts, Sports, Civics and Wellness. Explore hands-on AI workshops and Sac Tech Week, Broadway and museum programs, Kings basketball, public meetings and mindful movement. This edition also highlights Beers Books and Sacramento Food Bank & Family Services. Events are listed in Sacramento local time (PDT); the Rancho Cordova workshop is labeled as a regional outing. Follow the official links to confirm registration, ticket availability and schedule changes before making plans.",
  events: [...events, ...spotlights],
};
