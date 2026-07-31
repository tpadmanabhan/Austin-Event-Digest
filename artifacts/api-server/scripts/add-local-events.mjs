/**
 * add-local-events.mjs
 * One-time script: merges hand-curated local (non-Ticketmaster) events into
 * each city's current digest.  Events dated 7/31+ only; 8/2+ are featured.
 */

import { createHmac } from "crypto";

const BASE = "https://{subdomain}.eventcarpooling.com";

function adminToken(hash) {
  return createHmac("sha256", hash).update("admin-session").digest("hex");
}

const TENANTS = [
  {
    subdomain: "austincares", digestId: 85,
    passwordHash: "da297117bd280d438b4082b00b0b0159d2024bbfaa643509f07e2e4ecb8a1febd3f49f9b8da2ad15e52086092b686c81e506cb9a1b4bbeaaed0d69d62cc98d95:093f8368e18871dbd11b9afe9b832970",
  },
  {
    subdomain: "sacramento", digestId: 77,
    passwordHash: "dfd88f4cf97acdb339541d35c18dc5d5b63d8156987d09ada1bd0e2d0d59c720d3a9dc7fc9f3b0c719ebcdcbb1616426f83a8e1931b418c08d94c00f1238f56d:34de22808925446d571bcbd38ed5dc56",
  },
  {
    subdomain: "portland", digestId: 71,
    passwordHash: "7af356df13f43e6b5052fcdb53685d56f094934c645235c7063120eecd526c2cef55cae6802083eeb77b4ec17ba18e42e0f135822b62fa3d39b0d8a659d1b3f4:9ff84c03e62e7101770cbf036df75eb8",
  },
  {
    subdomain: "bulverde", digestId: 81,
    passwordHash: "e93382132390c96a7f24d27f21aacb08e3f70eba1fc555e69084bd15f7a90a4ade775c48a544880402b5f0b3d6eb4173a7fa7204648603d1881706bedbb40587:b32fb2673c07b8a661330426eeed8bfe",
  },
  {
    subdomain: "stlouis", digestId: 87,
    passwordHash: "9d0832717c9df457ca033d96018c1efa68a6a718e09d6ff125a23df8912d6757f0755fbb4b8297a2a90ff5544322d37c6d6f5944617631412099170ea9653588:d159f509ac83fbf04fd7dd77f37ef4d0",
  },
];

// ── Curated local events per city ─────────────────────────────────────────────
// featured: true  → next-week events (8/2–8/8)
// featured: false → this-week events (7/31–8/1)

const LOCAL_EVENTS = {

  austincares: [
    {
      title: "Central Texas Food Bank — Volunteer Shift",
      date: "Thursday, Jul 31 at 9:00 AM",
      venue: "Central Texas Food Bank, 6500 Metropolis Dr, Austin, TX",
      category: "Civics",
      description: "Sort and pack food for hungry families across Central Texas. Shifts are 3 hours and open to everyone — no experience needed. One of Austin's most impactful volunteer opportunities.",
      link: "https://www.centraltexasfoodbank.org/volunteer",
      imageUrl: null,
      featured: false,
    },
    {
      title: "Austin Animal Center — Community Dog Walk",
      date: "Friday, Aug 1 at 8:00 AM",
      venue: "Austin Animal Center, 7201 Levander Loop, Austin, TX",
      category: "Wellness",
      description: "Help shelter dogs get exercise and socialization before they find their forever homes. Drop-in friendly — just show up with your walking shoes. Dogs (and you) will be grateful.",
      link: "https://www.austintexas.gov/department/austin-animal-center",
      imageUrl: null,
      featured: false,
    },
    {
      title: "Keep Austin Beautiful — Barton Creek Greenbelt Cleanup",
      date: "Saturday, Aug 2 at 8:00 AM",
      venue: "Barton Creek Greenbelt, Barton Springs Rd Entrance, Austin, TX",
      category: "Civics",
      description: "Join Keep Austin Beautiful's monthly trail cleanup and protect one of the city's most beloved green spaces. Gloves and bags provided — bring water and sunscreen.",
      link: "https://www.keepaustinbeautiful.org",
      imageUrl: null,
      featured: true,
    },
    {
      title: "Austin Disaster Relief Network — Community Prep Workshop",
      date: "Sunday, Aug 3 at 10:00 AM",
      venue: "Austin Disaster Relief Network, 9901 Burnet Rd, Austin, TX",
      category: "Civics",
      description: "Learn hands-on disaster preparedness skills — from emergency food storage to neighborhood response networks. Free and open to the public. Great for families.",
      link: "https://www.adrn.org",
      imageUrl: null,
      featured: true,
    },
    {
      title: "Austin Community Fridge Network — Weekly Supply Drop",
      date: "Wednesday, Aug 5 at 5:00 PM",
      venue: "Various Austin Locations (see website)",
      category: "Civics",
      description: "Help stock Austin's network of community fridges with fresh food and shelf-stable items. Meet your neighbors and fight food insecurity — every donation makes a direct impact.",
      link: "https://www.austincommunityfridge.com",
      imageUrl: null,
      featured: true,
    },
  ],

  sacramento: [
    {
      title: "Midtown Farmers Market",
      date: "Saturday, Aug 1 at 8:00 AM",
      venue: "20th & J St, Sacramento, CA 95811",
      category: "Food & Markets",
      description: "Sacramento's beloved Midtown market with over 40 local farms and vendors. Fresh produce, artisan cheeses, honey, and a rotating lineup of prepared food. A true Saturday morning tradition.",
      link: "https://www.sacramento.org/neighborhoods/midtown/",
      imageUrl: null,
      featured: false,
    },
    {
      title: "Old Sacramento Waterfront — Free Summer Concert Series",
      date: "Friday, Aug 1 at 6:00 PM",
      venue: "Old Sacramento Waterfront, K St & Front St, Sacramento, CA",
      category: "Arts",
      description: "Live music on the waterfront with views of the Tower Bridge. Local bands, food vendors, and free entry. One of Sacramento's best summer traditions — bring a blanket and enjoy the river breeze.",
      link: "https://www.oldsacramento.com",
      imageUrl: null,
      featured: false,
    },
    {
      title: "Sacramento Public Library — Community Connections Day",
      date: "Thursday, Jul 31 at 10:00 AM",
      venue: "Sacramento Public Library, 828 I St, Sacramento, CA",
      category: "Civics",
      description: "Connect with local nonprofits, city services, and community organizations all under one roof. Free resources, workshops, and giveaways. Open to all Sacramento residents.",
      link: "https://www.saclibrary.org",
      imageUrl: null,
      featured: false,
    },
    {
      title: "Sacramento Urban Bee Festival",
      date: "Sunday, Aug 3 at 10:00 AM",
      venue: "Soil Born Farms, 2140 Chase Dr, Rancho Cordova, CA",
      category: "Wellness",
      description: "Celebrate urban beekeeping and food justice at this annual outdoor festival. Live demos, local honey tasting, kids' activities, and farm tours. A uniquely Sacramento experience.",
      link: "https://www.soilbornfarms.org",
      imageUrl: null,
      featured: true,
    },
    {
      title: "Sac Tech Meetup — AI & Automation in the Valley",
      date: "Tuesday, Aug 5 at 6:00 PM",
      venue: "The Urban Hive, 1601 Alhambra Blvd, Sacramento, CA",
      category: "Tech",
      description: "Sacramento's tech community gathers monthly for lightning talks, demos, and networking. This month: AI and automation tools for local businesses. Free to attend — RSVP on Meetup.",
      link: "https://www.meetup.com/sacramento-tech/",
      imageUrl: null,
      featured: true,
    },
    {
      title: "Land Park Farmers Market",
      date: "Saturday, Aug 8 at 8:00 AM",
      venue: "William Land Park, Sutterville Rd & Park Dr, Sacramento, CA",
      category: "Food & Markets",
      description: "A neighborhood gem inside beautiful William Land Park. Local produce, fresh flowers, baked goods, and breakfast burritos you won't forget. Perfect for a Saturday morning stroll.",
      link: "https://www.agriculturaldistrict.org",
      imageUrl: null,
      featured: true,
    },
  ],

  portland: [
    {
      title: "Portland Saturday Market",
      date: "Saturday, Aug 1 at 10:00 AM",
      venue: "2 SW Naito Pkwy, Portland, OR 97204",
      category: "Food & Markets",
      description: "America's largest continually operating outdoor arts and crafts market. 250+ local artists, food vendors, live music, and the iconic Skidmore Fountain. A Portland institution since 1974.",
      link: "https://portlandsaturdaymarket.com",
      imageUrl: null,
      featured: false,
    },
    {
      title: "Powell's Books — Author Reading & Signing",
      date: "Friday, Aug 1 at 7:00 PM",
      venue: "Powell's Books, 1005 W Burnside St, Portland, OR",
      category: "Arts",
      description: "The world's largest independent bookstore hosts author readings every week. Free to attend — grab a coffee from the in-store café and settle in for a great evening. Check website for this week's featured author.",
      link: "https://www.powells.com/events",
      imageUrl: null,
      featured: false,
    },
    {
      title: "Portland Community Gardens — Open Garden Day",
      date: "Thursday, Jul 31 at 10:00 AM",
      venue: "Fulton Community Garden, 68 SW Miles St, Portland, OR",
      category: "Wellness",
      description: "Portland's community garden network opens its gates for a morning of tours, planting demos, and seed swaps. Meet your neighbors, learn urban growing techniques, and take home some seedlings.",
      link: "https://www.portlandoregon.gov/parks/communitygarden",
      imageUrl: null,
      featured: false,
    },
    {
      title: "Portland Farmers Market at PSU",
      date: "Saturday, Aug 2 at 8:30 AM",
      venue: "South Park Blocks, Portland State University, Portland, OR",
      category: "Food & Markets",
      description: "Oregon's premier farmers market with 200+ vendors — local farms, food artisans, and prepared foods made fresh on-site. Live music, cooking demos, and the best coffee in the city.",
      link: "https://www.portlandfarmersmarket.org",
      imageUrl: null,
      featured: true,
    },
    {
      title: "First Thursday Art Walk — Pearl District",
      date: "Thursday, Aug 7 at 5:00 PM",
      venue: "Pearl District Galleries, NW 13th Ave, Portland, OR",
      category: "Arts",
      description: "Portland's beloved monthly art walk where Pearl District galleries open their doors for free. New exhibitions, artist meet-and-greets, and gallery wine. Over 20 galleries participate — walk at your own pace.",
      link: "https://www.firstthursdayportland.com",
      imageUrl: null,
      featured: true,
    },
    {
      title: "Portland Sunday Parkways — Inner SE Loop",
      date: "Sunday, Aug 3 at 11:00 AM",
      venue: "SE Division St & SE 50th Ave (Start), Portland, OR",
      category: "Wellness",
      description: "Portland closes its streets to cars for the city's beloved bicycle and pedestrian event. 8+ miles of open roads, neighborhood pit stops, live music, food carts, and community activities. Free for everyone.",
      link: "https://www.portlandoregon.gov/transportation/sunparkways",
      imageUrl: null,
      featured: true,
    },
    {
      title: "Portland Tech Meetup — Climate & Clean Energy",
      date: "Wednesday, Aug 6 at 6:00 PM",
      venue: "CENTRL Office, 1355 NW Everett St, Portland, OR",
      category: "Tech",
      description: "Portland's tech community discusses local innovation in climate tech and clean energy. Lightning talks, networking, and a panel of Oregon-based founders. Free to attend — RSVP requested.",
      link: "https://www.meetup.com/portland-tech/",
      imageUrl: null,
      featured: true,
    },
  ],

  bulverde: [
    {
      title: "The Pearl Farmers Market",
      date: "Saturday, Aug 1 at 9:00 AM",
      venue: "Pearl Brewery, 200 E Grayson St, San Antonio, TX",
      category: "Food & Markets",
      description: "San Antonio's premier farmers market at the historic Pearl Brewery complex. Local farms, artisan food producers, live music, and the best breakfast tacos in Texas. A true SA Saturday morning.",
      link: "https://atpearl.com/events/",
      imageUrl: null,
      featured: false,
    },
    {
      title: "San Antonio River Walk — Free Summer Evening Stroll",
      date: "Friday, Aug 1 at 7:00 PM",
      venue: "San Antonio River Walk, Commerce St, San Antonio, TX",
      category: "Wellness",
      description: "Take in the lights and cool evening air along one of Texas's most iconic urban spaces. Dozens of restaurants, live music spilling from open doors, and boat tours still running. Free to walk anytime.",
      link: "https://www.thesanantonioriverwalk.com",
      imageUrl: null,
      featured: false,
    },
    {
      title: "Bulverde Community Market",
      date: "Saturday, Aug 1 at 8:00 AM",
      venue: "Bulverde Village Shopping Center, Hwy 281 & Spring Branson Rd, Bulverde, TX",
      category: "Food & Markets",
      description: "Your local Saturday morning market featuring Hill Country farms, homemade jams, Texas honey, and local artisans. A community staple for Bulverde families — bring the kids and the dogs.",
      link: "https://www.bulverdetx.gov",
      imageUrl: null,
      featured: false,
    },
    {
      title: "La Villita Arts Village — Summer Night Market",
      date: "Saturday, Aug 2 at 6:00 PM",
      venue: "La Villita Historic Arts Village, 418 Villita St, San Antonio, TX",
      category: "Arts",
      description: "San Antonio's oldest neighborhood transforms into an evening market with 30+ local artists, live Tejano and jazz music, and handcrafted goods. Free to browse — right in the heart of downtown SA.",
      link: "https://www.lavillitasanantonio.com",
      imageUrl: null,
      featured: true,
    },
    {
      title: "San Antonio Museum of Art — Free Family Sunday",
      date: "Sunday, Aug 3 at 10:00 AM",
      venue: "San Antonio Museum of Art, 200 W Jones Ave, San Antonio, TX",
      category: "Arts",
      description: "SAMA opens its doors free to all San Antonio residents every Sunday. World-class collection including the largest collection of ancient Greek, Roman, and Egyptian art in the southern US. Great for families.",
      link: "https://www.samuseum.org",
      imageUrl: null,
      featured: true,
    },
    {
      title: "Geekdom — SA Tech & Startup Meetup",
      date: "Thursday, Aug 7 at 6:00 PM",
      venue: "Geekdom, 110 E Houston St, San Antonio, TX",
      category: "Tech",
      description: "San Antonio's thriving tech community gathers at Geekdom for demos, pitches, and networking. Founders, developers, and innovators from across the Hill Country region. Free to attend.",
      link: "https://geekdom.com/events/",
      imageUrl: null,
      featured: true,
    },
    {
      title: "Comal County Civic Forum — Community Q&A",
      date: "Tuesday, Aug 5 at 6:30 PM",
      venue: "Bulverde Community Center, 30360 Cougar Bend, Bulverde, TX",
      category: "Civics",
      description: "Local leaders and residents gather for an open Q&A on Bulverde's growth, infrastructure, and parks plans. Your chance to ask questions and shape the future of your community.",
      link: "https://www.bulverdetx.gov",
      imageUrl: null,
      featured: true,
    },
  ],

  stlouis: [
    {
      title: "Soulard Farmers Market",
      date: "Saturday, Aug 1 at 8:00 AM",
      venue: "730 Carroll St, St. Louis, MO 63104",
      category: "Food & Markets",
      description: "One of the oldest farmers markets in the country. Fresh produce, local vendors, live music, and the best breakfast burritos in the city. A St. Louis Saturday institution since 1779.",
      link: "https://soulardmarket.com",
      imageUrl: null,
      featured: false,
    },
    {
      title: "Gateway Arch — Evening Riverfront Walk",
      date: "Thursday, Jul 31 at 6:30 PM",
      venue: "Gateway Arch National Park, St. Louis, MO",
      category: "Wellness",
      description: "Take in the Arch at golden hour and stroll the Mississippi riverfront as the city lights up. Free, open to all, and one of the most iconic views in America. Tram rides available inside.",
      link: "https://www.nps.gov/jeff/index.htm",
      imageUrl: null,
      featured: false,
    },
    {
      title: "St. Louis Art Museum (SLAM) — Free Admission",
      date: "Friday, Aug 1 at 10:00 AM",
      venue: "1 Fine Arts Dr, Forest Park, St. Louis, MO",
      category: "Arts",
      description: "The Saint Louis Art Museum in Forest Park offers free general admission every day. World-class collection spanning 5,000 years — from Egyptian antiquities to contemporary art. Free parking in Forest Park.",
      link: "https://www.slam.org",
      imageUrl: null,
      featured: false,
    },
    {
      title: "City Museum After Dark",
      date: "Friday, Aug 1 at 5:00 PM",
      venue: "750 N 16th St, St. Louis, MO 63103",
      category: "Arts",
      description: "St. Louis's legendary playground for adults — a multi-story wonder of reclaimed architecture, caves, slides, and a rooftop schoolbus. Unlike anything else in the world. Friday nights stay open late.",
      link: "https://citymuseum.org",
      imageUrl: null,
      featured: false,
    },
    {
      title: "Tower Grove Farmers Market",
      date: "Saturday, Aug 2 at 8:00 AM",
      venue: "Tower Grove Park, 4256 Magnolia Ave, St. Louis, MO",
      category: "Food & Markets",
      description: "St. Louis's best-loved neighborhood farmers market inside beautiful Tower Grove Park. Local farms, specialty food vendors, artisan crafts, and live music every Saturday morning.",
      link: "https://www.tgmarket.org",
      imageUrl: null,
      featured: true,
    },
    {
      title: "Laumeier Sculpture Park — Free Summer Weekend",
      date: "Sunday, Aug 3 at 10:00 AM",
      venue: "12580 Rott Rd, St. Louis, MO 63127",
      category: "Wellness",
      description: "Explore 105 acres of outdoor sculpture in one of the country's premier outdoor art museums. Free admission always — walk the trails, picnic on the lawn, and discover monumental works in a natural setting.",
      link: "https://laumeier.org",
      imageUrl: null,
      featured: true,
    },
    {
      title: "STL Tech Meetup — AI Tools for Local Business",
      date: "Wednesday, Aug 6 at 6:30 PM",
      venue: "T-REX, 911 Washington Ave, St. Louis, MO 63101",
      category: "Tech",
      description: "St. Louis's tech community gathers at T-REX startup hub for demos and discussion on practical AI tools for businesses. Lightning talks, networking, and drinks. Free — RSVP on Meetup.",
      link: "https://www.meetup.com/stl-tech/",
      imageUrl: null,
      featured: true,
    },
  ],
};

// ── Core helpers ──────────────────────────────────────────────────────────────

async function getCurrentEvents(subdomain, token, digestId) {
  const url = `https://${subdomain}.eventcarpooling.com/api/events/digest/list`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json();
  const digests = body.digests ?? (Array.isArray(body) ? body : []);
  const digest = digests.find(d => d.id === digestId);
  return digest ? (digest.events || []) : [];
}

async function patchDigest(subdomain, token, digestId, events) {
  const url = `https://${subdomain}.eventcarpooling.com/api/events/digest/${digestId}/events`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
  });
  return res.ok;
}

async function triggerGeocode(subdomain, token, digestId) {
  const url = `https://${subdomain}.eventcarpooling.com/api/events/digest/${digestId}/regeocoded`;
  await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log("\n============================================================");
console.log("Add local curated events (7/31+ only)");
console.log("============================================================\n");

for (const tenant of TENANTS) {
  const { subdomain, digestId, passwordHash } = tenant;
  const token = adminToken(passwordHash);
  const newEvents = LOCAL_EVENTS[subdomain] ?? [];

  console.log(`── ${subdomain.toUpperCase()} (digest ${digestId}) ──`);

  const existing = await getCurrentEvents(subdomain, token, digestId);
  console.log(`  Existing: ${existing.length} events`);

  // Deduplicate by title — skip any local event already in the digest
  const existingTitles = new Set(existing.map(e => e.title.toLowerCase().trim()));
  const toAdd = newEvents.filter(e => !existingTitles.has(e.title.toLowerCase().trim()));
  console.log(`  Local events to add: ${toAdd.length} (${newEvents.length - toAdd.length} already present)`);

  if (toAdd.length === 0) {
    console.log("  ✓ Nothing to add\n");
    continue;
  }

  const merged = [...existing, ...toAdd];
  const ok = await patchDigest(subdomain, token, digestId, merged);
  if (ok) {
    console.log(`  ✅ Patched → ${merged.length} total events`);
    await triggerGeocode(subdomain, token, digestId);
    console.log("  📍 Geocoding triggered\n");
  } else {
    console.log("  ❌ Patch failed\n");
  }
}

console.log("============================================================");
console.log("Done.");
console.log("============================================================\n");
