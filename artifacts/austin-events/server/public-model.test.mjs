import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import net from "node:net";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolveSite, legacyRedirectHost, eventSchema, validIsoDate, venueIdentity, publicApiOrigin, publicEditionRange } from "./public-model.mjs";

const cities = ["nyc", "dallas", "la", "austin", "golf", "atlanta", "tokyo", "austincares", "sanfrancisco",
  "brushycreek", "portland", "sacramento", "bulverde", "stlouis", "dc", "houston", "boston", "miami", "osaka", "manchester"];
const tenants = cities.filter(slug => slug !== "golf").map((slug, i) => ({ slug, id: i + 1, name: slug === "atlanta" ? "Atlanta Events" : `${slug} community`, city: slug }));
const golfTenant = { slug: "golf", id: 21, name: "Golf IRL", city: "Austin, TX" };
const leadershipAustinTenant = { slug: "leadershipaustin", id: 20, name: "Leadership Austin", city: "Austin, TX" };
const eventId = city => `ev-${String(cities.indexOf(city) + 1).padStart(24, "0")}`;
const fixture = city => ({
  id: cities.indexOf(city) + 10,
  weekOf: city === "nyc" || city === "dallas" ? "2026-10-23T00:00:00.000Z" : city === "manchester" ? "2026-10-22T00:00:00.000Z" : "2031-10-12T00:00:00.000Z",
  subject: city === "nyc" ? "New York City Events — October 23–31, 2026" : city === "dallas" ? "Dallas Events: October 23–31, 2026" : city === "manchester" ? "Manchester Events — October 22–31, 2026" : `${city} test edition`,
  intro: "A test newsletter introduction.",
  events: [{ eventId: eventId(city), title: `${city} test community talk`, date: "October 12, 2031 at noon UTC",
    startDate: "2031-10-12T12:00:00Z", venue: `${city} test hall`, venueAddress: "1 Test Street",
    description: "A fixture for response tests, not a live listing.", category: "Community",
    link: "https://example.test/official-event" },
    { eventId: "ev-000000000000000000000090", title: "Test spotlight", date: "", venue: "", description: "Not an event.", category: "Business", isBusinessSpotlight: true }],
});
let backend, child, base, failed = false, intro = null;
const root = fileURLToPath(new URL("../", import.meta.url));
const close = server => new Promise(resolve => server.close(resolve));
const listen = server => new Promise(resolve => server.listen(0, "127.0.0.1", resolve));

before(async () => {
  backend = http.createServer((req, res) => {
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const city = host.split(".")[0];
    res.setHeader("Content-Type", "application/json");
    if (failed) { res.writeHead(500); return res.end('{"error":"test_failure"}'); }
    if (!cities.includes(city) && city !== "leadershipaustin" && host !== "irl.group") { res.writeHead(404); return res.end("{}"); }
    if (req.url === "/api/tenants/list") {
      const hostTenants = city === "leadershipaustin" ? [...tenants, leadershipAustinTenant]
        : city === "golf" ? [...tenants, golfTenant] : tenants;
      return res.end(JSON.stringify({ tenants: hostTenants }));
    }
    if (req.url === "/api/tenant/config?slug=leadershipaustin") {
      return res.end(JSON.stringify({ tenant: { leadershipClassProfiles: [{
        id: "emerge-18",
        className: "LA Emerge 18-2025",
        classRepName: "Alexandria Robertson",
        classRepLinkedInUrl: "",
        teamWhatsAppUrl: "https://chat.whatsapp.com/example",
        teamLinkedInUrl: "https://www.linkedin.com/groups/example/",
        classPhotoUrl: "/api/storage/objects/class-photo",
        classRepPhotoUrl: "/api/storage/objects/rep-photo",
      }] } }));
    }
    if (req.url === "/api/deals/submitted") return res.end(JSON.stringify({ deals: [
      { id: 1, business: "Test approved community offer", deal: "A test offer", locationName: "Test shop", locationAddress: "2 Test Street" },
    ] }));
    if (req.url === "/api/events/digest/list") {
      const latest = fixture(city);
      if (intro) latest.intro = intro;
      const older = structuredClone(latest);
      older.id -= 5; older.events[0].title = "Older event title";
      return res.end(JSON.stringify({ digests: [latest, older] }));
    }
    res.writeHead(404); res.end("{}");
  });
  await listen(backend);
  const probe = net.createServer(); await listen(probe);
  const port = probe.address().port; await close(probe);
  base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ["server/index.mjs"], { cwd: root,
    env: { ...process.env, NODE_ENV: "production", PORT: String(port),
      INTERNAL_API_ORIGIN: `http://127.0.0.1:${backend.address().port}` }, stdio: ["ignore", "pipe", "pipe"] });
  let errors = ""; child.stderr.on("data", data => { errors += data; });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base + "/healthz")).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Test web server did not start: ${errors}`);
});

after(async () => {
  if (child && child.exitCode === null) { child.kill(); await new Promise(resolve => child.once("exit", resolve)); }
  if (backend) await close(backend);
});

async function document(host, pathname = "/", userAgent = "ordinary-browser") {
  // Existing page fixtures use the previous hostname; route those requests to
  // the current host so the assertions keep exercising the page behavior.
  const currentHost = legacyRedirectHost(host) || host;
  return rawDocument(currentHost, pathname, userAgent);
}
async function rawDocument(host, pathname = "/", userAgent = "ordinary-browser") {
  const response = await fetch(base + pathname, { headers: { Host: host, "X-Forwarded-Host": host, "User-Agent": userAgent }, redirect: "manual" });
  return { response, body: await response.text() };
}
const modelOf = body => JSON.parse(body.match(/<script id="public-document" type="application\/json">([\s\S]*?)<\/script>/)[1]);

test("Austin community spotlight links say Visit on both pages and retain city-specific behavior", () => {
  for (const page of ["home.tsx", "digest.tsx"]) {
    const source = readFileSync(new URL(`../src/pages/${page}`, import.meta.url), "utf8");
    const cta = 'tenant.slug === "austin" ? "Visit" : jt("Apply Now", JA.applyNow)';
    const ctaIndex = source.indexOf(cta);
    assert.notEqual(ctaIndex, -1, `${page} should use the Austin-only Visit label`);

    const anchorStart = source.lastIndexOf("<a", ctaIndex);
    const anchorEnd = source.indexOf("</a>", ctaIndex);
    assert.ok(anchorStart >= 0 && anchorEnd > ctaIndex, `${page} should render the CTA in a link`);
    const anchor = source.slice(anchorStart, anchorEnd);
    assert.match(anchor, /target="_blank"/);
    assert.match(anchor, /rel="noopener noreferrer"/);
    assert.match(source.slice(ctaIndex, ctaIndex + cta.length), /jt\("Apply Now", JA\.applyNow\)/);
  }
});

test("Leadership Austin's public edition renders its configured class and rep photos", async () => {
  const { response, body } = await document("leadershipaustin.irl.group");
  assert.equal(response.status, 200);
  const model = modelOf(body);
  assert.equal(model.leadershipClassProfiles[0].className, "LA Emerge 18-2025");
  assert.equal(model.leadershipClassProfiles[0].classRepName, "Alexandria Robertson");
  assert.equal(model.leadershipClassProfiles[0].classRepPhotoUrl, "/api/storage/objects/rep-photo");
  assert.match(body, /src="\/api\/storage\/objects\/class-photo"/);
  assert.match(body, /src="\/api\/storage\/objects\/rep-photo"/);
  assert.match(body, /Alexandria Robertson/);
  assert.match(body, /Team WhatsApp group/);
  assert.match(body, /Team LinkedIn group/);
  assert.match(body, /Read the full .* edition/);
  assert.match(body, /bg-\[#314363\]/);
});

test("Leadership Austin full editions end with a subscriber event contribution prompt", async () => {
  const { response, body } = await document("leadershipaustin.irl.group", "/digest/9");
  assert.equal(response.status, 200);
  const model = modelOf(body);
  assert.equal(model.leadershipClassProfiles[0].classRepPhotoUrl, "/api/storage/objects/rep-photo");
  assert.match(body, /src="\/api\/storage\/objects\/class-photo"/);
  assert.match(body, /src="\/api\/storage\/objects\/rep-photo"/);
  assert.match(body, /Suggest a community event/);
  assert.match(body, /Active subscribers can submit public events for review/);
  assert.match(body, /Approved events may appear on this site and in a future newsletter/);
  assert.match(body, /href="[^"]*#add-event"/);
  assert.match(body, /View the Leadership Austin information page/);
});

test("Toys for Tots information page is public only on Leadership Austin", async () => {
  const home = await document("leadershipaustin.irl.group", "/");
  assert.equal(home.response.status, 200);
  assert.match(home.body, /Support Toys for Tots in Austin/);
  assert.match(home.body, /View the Leadership Austin information page/);

  const leadership = await document("leadershipaustin.irl.group", "/toys-for-tots");
  assert.equal(leadership.response.status, 200);
  const model = modelOf(leadership.body);
  assert.equal(model.kind, "toys-for-tots");
  assert.equal(model.canonical, "https://leadershipaustin.irl.group/toys-for-tots");
  assert.match(leadership.body, /secure\.toysfortots\.org\/a\/donatelocal/);
  assert.match(leadership.body, /does not announce a Leadership Austin collection or drop-off location/i);

  const austin = await document("austin.irl.group", "/toys-for-tots");
  assert.equal(austin.response.status, 404);
});

test("Leadership Austin client pages use admin-managed profiles in both shared views", () => {
  const home = readFileSync(new URL("../src/pages/home.tsx", import.meta.url), "utf8");
  const digest = readFileSync(new URL("../src/pages/digest.tsx", import.meta.url), "utf8");
  assert.match(home, /<LeadershipClassProfiles profiles={tenant\.leadershipClassProfiles} variant="dark" \/>/);
  assert.match(digest, /<LeadershipAlumniTestimonial[\s\S]*?profiles={tenant\.leadershipClassProfiles}[\s\S]*?\/>/);
  assert.match(digest, /<AlumniHappeningsSection events={editionEvents as any\[\]} compact \/>/);
  assert.doesNotMatch(home, /Suggest a community event/);
  assert.match(home, /LeadershipToysForTotsCallout/);
  assert.match(digest, /LeadershipToysForTotsCallout/);
});

test("Leadership Austin full edition has one subscriber-verified event submission form after listings", () => {
  const digest = readFileSync(new URL("../src/pages/digest.tsx", import.meta.url), "utf8");
  const contribution = digest.indexOf("{isSubscriberCommunity && <LeadershipEventContribution");
  const eventListings = digest.indexOf("regularEvents.map");
  const cityPromo = digest.indexOf("{/* AustinCares launch promo");
  assert.ok(eventListings >= 0 && contribution > eventListings && cityPromo > contribution);
  assert.equal((digest.match(/<LeadershipEventContribution communityName=\{tenant\.name\} \/>/g) || []).length, 1);
  assert.doesNotMatch(digest, /leadership-event-contribution-cta-title|Know an event the community should see\?|Suggest a community event/);
});

test("host resolution never defaults an unknown production host to Austin", () => {
  assert.equal(resolveSite("unrelated.example", false), null);
  assert.equal(resolveSite("tokyo.irl.group", false).slug, "tokyo");
  assert.equal(resolveSite("irl.group", false).slug, null);
  for (const slug of cities) assert.equal(resolveSite(`${slug}.irl.group`, false).slug, slug);
  assert.equal(legacyRedirectHost("eventcarpooling.com"), "irl.group");
  assert.equal(legacyRedirectHost("www.eventcarpooling.com"), "irl.group");
  assert.equal(legacyRedirectHost("tokyo.eventcarpooling.com"), "tokyo.irl.group");
  assert.equal(legacyRedirectHost("api.eventcarpooling.com"), null);
});
test("published API requests never default to the development-only port-80 proxy", () => {
  assert.equal(publicApiOrigin({ NODE_ENV: "production" }), "https://irl.group");
  assert.equal(publicApiOrigin({ NODE_ENV: "development" }), "http://127.0.0.1:80");
  assert.equal(publicApiOrigin({ NODE_ENV: "production", INTERNAL_API_ORIGIN: "http://127.0.0.1:9000" }), "http://127.0.0.1:9000");
});
test("verified date validation rejects guessed years, impossible days and missing offsets", () => {
  assert.equal(validIsoDate("October 12 at noon"), false);
  assert.equal(validIsoDate("2031-02-30"), false);
  assert.equal(validIsoDate("2031-10-12T12:00:00"), false);
  assert.equal(validIsoDate("2031-10-12T12:00:00.000Z"), true);
  assert.equal(validIsoDate("2031-10-12"), true);
  assert.equal(eventSchema({ ...fixture("austin").events[0], startDate: undefined }, "https://austin.irl.group"), undefined);
});
test("trusted extended editions expose their actual date range instead of a week label", () => {
  for (const city of ["houston", "tokyo", "stlouis", "portland", "bulverde", "dc"]) {
    assert.equal(publicEditionRange(city, `${city} Events: October 17–31, 2026`), "October 17 – October 31, 2026");
  }
  assert.equal(publicEditionRange("houston", "Houston Events: October 17–23, 2026"), "October 17 – October 23, 2026");
  assert.equal(publicEditionRange("manchester", "Manchester Events — October 22–31, 2026"), "October 22 – October 31, 2026");
  assert.equal(publicEditionRange("nyc", "New York City Events — October 23–31, 2026"), "October 23 – October 31, 2026");
  assert.equal(publicEditionRange("dallas", "Dallas Events: October 23–31, 2026"), "October 23 – October 31, 2026");
  assert.equal(publicEditionRange("futurecity", "Future Events: October 17–31, 2026"), undefined);
});
test("the platform document is readable and has real city links without scripts running", async () => {
  const { response, body } = await document("eventcarpooling.com");
  assert.equal(response.status, 200);
  assert.match(body, /Make room for the real\./);
  assert.match(body, /Suggest a city/);
  assert.match(body, /Local AI Ethics/);
  assert.match(body, /Intelligence with integrity/);
  assert.match(body, /Every edition has its own point of view/);
  assert.match(body, /Raj’s Austin Events/);
  assert.match(body, /https:\/\/austincares\.irl\.group/);
  assert.match(body, /https:\/\/golf\.irl\.group/);
  assert.match(body, /https:\/\/nyc\.irl\.group/);
  assert.match(body, /https:\/\/dallas\.irl\.group/);
  const platformHomeSource = readFileSync(new URL("../src/pages/platform-home.tsx", import.meta.url), "utf8");
  assert.match(platformHomeSource, /<CityEventsFeed \/>/,
    "the hydrated irl.group landing page should show the cross-city event feed");
  assert.match(platformHomeSource, /const FEATURED_CITY_SLUG = "golf"/,
    "Golf IRL should be the featured city");
  assert.match(platformHomeSource, /const LIVE_CITY_ORDER = \["golf", "austin", "nyc", "dallas"/,
    "Golf IRL should lead, with Austin next in the city directory");
  assert.match(platformHomeSource, /const NEW_CITY_SLUGS = new Set\(\["golf", "austin"\]\)/,
    "Golf IRL and Austin should both carry the New badge");
  assert.match(platformHomeSource, /city\.slug === FEATURED_CITY_SLUG \? "city-card-featured"/,
    "Golf IRL should use the featured card style");
  assert.match(platformHomeSource, /NEW_CITY_SLUGS\.has\(city\.slug\).*copy\.newBadge/,
    "the New badge should use the shared translated label");
  const platformHomeCopySource = readFileSync(new URL("../src/i18n/platform-home.ts", import.meta.url), "utf8");
  assert.doesNotMatch(platformHomeCopySource, /NEW EDITION|新しい都市版/,
    "the Boston collage label should not imply another new city");
  const japaneseCityCopySource = platformHomeCopySource.slice(platformHomeCopySource.indexOf("export const JAPANESE_CITY_COPY:"));
  for (const slug of ["golf", "austin", "nyc", "dallas", "manchester", "osaka", "la", "boston", "atlanta", "sanfrancisco", "sacramento", "miami", "houston", "tokyo", "stlouis", "portland", "bulverde", "dc"]) {
    assert.match(japaneseCityCopySource, new RegExp(`^\\s{2}${slug}:`, "m"), `${slug} should have Japanese directory copy`);
  }
  assert.match(body, /<title>In Real Life \(IRL\) — Worthwhile things, close by<\/title>/);
  assert.match(body, /<meta property="og:title" content="In Real Life \(IRL\) — Worthwhile things, close by">/);
  assert.doesNotMatch(body, /EventCarpooling|eventcarpooling-logo/i);
  const model = modelOf(body);
  assert.equal(model.title, "In Real Life (IRL) — Worthwhile things, close by");
  assert.equal(model.schema.name, "In Real Life");
  assert.equal(model.schema.alternateName, "IRL");
  assert.equal(model.cities[0].slug, "golf");
  assert.equal(model.cities[1].slug, "austin");
  assert.equal(model.cities[2].slug, "nyc");
  assert.equal(model.cities[3].slug, "dallas");
  assert.equal(model.cities[4].slug, "manchester");
  assert.ok(model.cities.some(city => city.slug === "manchester"), "Manchester should remain in the directory");
  assert.equal(model.cities.length, 20);
  assert.ok(model.cities.every(city => city.url.startsWith("https://") && city.url.endsWith(".irl.group/")));
  assert.ok(model.cities.every(city => !("isNew" in city)), "City listings must not advertise New badges");
  assert.match(model.cities[2].ethicsUrl, /nyc\.irl\.group\/#city-ai-ethics/);
  assert.equal(model.cities[5].slug, "la");
  assert.match(body, /https:\/\/tokyo\.irl\.group\//);
  assert.match(body, /<h1/);
  assert.equal(modelOf(body).kind, "platform");
  assert.match(body, /<div id="public-fallback">/);
  assert.match(body, /<div id="root"><\/div>/);
  assert.ok(body.indexOf('setAttribute("data-public-boot","pending")') < body.indexOf('<div id="public-fallback">'));
});
test("hydrated About pages do not hide their initial document behind an app handoff", async () => {
  const { response, body } = await document("eventcarpooling.com", "/about");
  assert.equal(response.status, 200);
  assert.match(body, /<div id="root"><div/);
  assert.match(body, /<title>About In Real Life \| IRL<\/title>/);
  assert.doesNotMatch(body, /EventCarpooling|eventcarpooling-logo/i);
  assert.doesNotMatch(body, /id="public-fallback"|id="public-app-loading"|data-public-boot/);
});
test("Spock's role and transparent mascot are in public platform and About HTML", async () => {
  for (const path of ["/", "/about"]) {
    const { response, body } = await document("eventcarpooling.com", path);
    assert.equal(response.status, 200);
    assert.match(body, /Spock/);
    assert.match(body, /images\/spock-mascot\.png/);
    assert.match(body, /research/i);
    assert.match(body, /newsletters/i);
    assert.match(body, /review/i);
  }
});
test("city and historical edition responses are tenant-specific and readable", async () => {
  for (const city of ["austin", "atlanta", "tokyo", "sanfrancisco", "nyc"]) {
    const { response, body } = await document(`${city}.eventcarpooling.com`);
    assert.equal(response.status, 200);
    assert.match(body, new RegExp(`${city} test community talk`));
    assert.equal(modelOf(body).citySlug, city);
    const edition = await document(`${city}.eventcarpooling.com`, `/digest/${fixture(city).id}`);
    assert.equal(edition.response.status, 200);
    assert.equal(modelOf(edition.body).kind, "digest");
  }
});
test("Austin's public city and edition documents render current content in one AI Ethics section", async () => {
  const host = "austin.eventcarpooling.com";
  for (const pathname of ["/", `/digest/${fixture("austin").id}`]) {
    const { response, body } = await document(host, pathname);
    assert.equal(response.status, 200);
    assert.ok(body.includes("A test newsletter introduction."));
    assert.equal((body.match(/<h2[^>]*>AI Ethics<\/h2>/g) || []).length, 1);
    assert.ok(!body.includes("Why America Turned Blue?"));
    assert.ok(body.includes("What Texas Turning Blue Could Mean for Data Centers and the AI Industry in the U.S."));
    assert.ok(body.includes("https://www.ibtimes.com/gina-hinojosa-texas-data-center-moratorium-ai-3809416"));
    assert.ok(body.indexOf("What Texas Turning Blue Could Mean") < body.indexOf("Gina Hinojosa on data centers and immigration"));
    assert.ok(body.includes("https://www.nytimes.com/video/us/politics/100000011266333/gina-hinojosa-data-centers-immigration-texas.html"));
    assert.ok(body.includes("Pflugerville adopts new policy for AI, surveillance technology and data privacy"));
    assert.ok(body.includes("SAFE Technology policy covering AI, surveillance and data sharing"));
    assert.ok(body.includes("Round Rock should adopt enforceable guardrails and public reporting like Pflugerville instead of leaving procurement to an unchecked free-market approach."));
    assert.ok(body.includes("https://communityimpact.com/pflugerville-hutto/government/pflugerville-adopts-new-policy-for-ai-surveillance-technology-and-data-privacy/"));
    assert.ok(body.indexOf("Gina Hinojosa on data centers and immigration") < body.indexOf("Pflugerville adopts new policy for AI, surveillance technology and data privacy"));
    assert.ok(body.indexOf("Pflugerville adopts new policy for AI, surveillance technology and data privacy") < body.indexOf("dumb carpooling idea"));
    assert.ok(body.includes("dumb carpooling idea"));
    assert.ok(body.includes("https://www.msn.com/en-us/news/other/new-carpool-program-aims-to-reduce-congestion-offers-incentive-for-i-35-commuters-in-austin-area/ar-AA2gPBgP"));
    assert.ok(body.includes("The problem with IRL: Is any of it real?"));
    assert.ok(body.includes("AI-generated slop and apps with outlandish claims"));
    assert.ok(body.includes("https://mashable.com/article/irl-shuts-down-20-million-users-bots"));
    assert.ok(body.includes("IRL.group: a home for local creators"));
    assert.ok(body.includes("commercial and nonprofit pilots to help fine-tune the project"));
    const removedItems = [
      "ServiceSpace and Awakin Circles",
      "https://nipun.servicespace.org/",
      "https://www.awakin.org/",
      "The IRL economy is taking off",
      "https://fortune.com/2026/10/25/irl-economy-live-events-experience-economy-ai/",
      "Golfer Scottie Scheffler on choosing the right partnerships",
      "https://www.nytimes.com/athletic/7708954/2026/10/21/scottie-scheffler-golf-commercial-impact/",
      "What you’ll find here",
      "I’ll favor recurring, mindful gatherings over transactional one-offs",
      "Faith leaders and AI guardrails",
      "https://religionnews.com/2026/09/15/at-ai-conference-religious-leaders-confront-what-technology-could-cost-humanity/",
      "IRL’s upcoming Groups feature applies privacy-first thinking to local community",
      "Texas data-center governance, permits, and air quality",
      "https://www.texastribune.org/2026/10/30/rick-perry-texas-data-center-fermi-project-matador/",
      "We are telling AI chatbots our biggest secrets",
      "https://tech.yahoo.com/cybersecurity/articles/telling-ai-chatbots-biggest-secrets-144603184.html",
      "Meta's AI shopping agent threatens Amazon",
      "https://seekingalpha.com/news/4661876-metas-ai-shopping-agent-threatens-amazons-lucrative-advertising-business",
      "Proton's CTO wrote a manifesto for the AI coding age",
      "https://www.aol.com/articles/protons-cto-wrote-manifesto-ai-083701000.html",
      "Spurs² Hackathon at UT Austin",
      "https://customersuccessforgood.com/2026/10/26/spurs-hackathon-git/",
      "Why Every Election Matters to Democracy with Stacey Abrams",
      "https://podcasts.apple.com/us/podcast/guy-kawasaki",
    ];
    for (const item of removedItems) assert.ok(!body.includes(item), `removed item remains in AI Ethics section: ${item}`);
    assert.ok(body.indexOf("AI Ethics") < body.indexOf("IRL.group: a home for local creators"));
  }
});
test("San Francisco shares its Golden Gate image in initial homepage and edition HTML", async () => {
  const host = "sanfrancisco.irl.group";
  const image = `https://${host}/images/sanfrancisco-hero.jpg`;
  for (const pathname of ["/", `/digest/${fixture("sanfrancisco").id}`]) {
    const { response, body } = await document(host, pathname, "facebookexternalhit/1.1");
    assert.equal(response.status, 200);
    assert.ok(body.includes(`<meta property="og:image" content="${image}">`));
    assert.ok(body.includes(`<meta name="twitter:image" content="${image}">`));
    assert.doesNotMatch(body, /<meta (?:property="og:image"|name="twitter:image") content="[^"]*\/opengraph\.jpg"/);
    assert.equal(modelOf(body).citySlug, "sanfrancisco");
  }
  const asset = await document(host, "/images/sanfrancisco-hero.jpg");
  assert.equal(asset.response.status, 200);
  assert.match(asset.response.headers.get("content-type"), /^image\/jpeg/);
  const austin = await document("austin.irl.group");
  assert.match(austin.body, /<meta property="og:image" content="https:\/\/austin\.irl\.group\/opengraph\.jpg">/);
});
test("every city sends its configured share image or platform fallback in the initial document", async () => {
  const expected = {
    austin: "/opengraph.jpg",
    golf: "/images/golf-share-tagline.png",
    austincares: "/images/austin-cares-brand-icon.jpg",
    brushycreek: "/images/brushycreek-hero.jpg",
    portland: "/images/portland-hero.jpg",
    sacramento: "/images/sacramento-hero.jpg",
    bulverde: "/images/bulverde-hero.jpg",
    stlouis: "/images/stlouis-hero.jpg",
    dc: "/images/dc-hero.jpg",
    atlanta: "/api/storage/public-objects/city-previews/atlanta-share.png",
    houston: "/images/houston-dusk.jpg",
    sanfrancisco: "/images/sanfrancisco-hero.jpg",
    boston: "/api/storage/public-objects/cities/boston/hero.jpg",
    la: "https://upload.wikimedia.org/wikipedia/commons/3/33/POINTDUME_CA6.jpg",
    miami: "/api/storage/public-objects/cities/miami/share.jpg",
    tokyo: "https://images.unsplash.com/photo-1480796927426-f609979314bd",
    osaka: "/images/osaka-hero.jpg",
    manchester: "/images/manchester-share.jpg",
    nyc: "/images/nyc-share.jpg",
    dallas: "/images/dallas-hero.jpg",
  };
  for (const city of cities) {
    const host = `${city}.irl.group`;
    const paths = city === "austincares" ? ["/", "/full", "/about"] : ["/", `/digest/${fixture(city).id}`, "/about"];
    for (const pathname of paths) {
      const { response, body } = await document(host, pathname, "facebookexternalhit/1.1");
      assert.equal(response.status, 200, `${city}${pathname}`);
      assert.match(body, new RegExp(`<html[^>]+data-tenant="${city}"`));
      const image = body.match(/<meta property="og:image" content="([^"]+)">/)[1];
      const twitter = body.match(/<meta name="twitter:image" content="([^"]+)">/)[1];
      assert.equal(twitter, image);
      assert.match(body, /<meta name="twitter:card" content="summary_large_image">/);
      assert.ok(image.includes(expected[city]), `${city}: ${image}`);
      if (city !== "austin") {
        assert.doesNotMatch(image, /\/opengraph\.jpg|\/austin-hero\.png/);
      }
      assert.equal(modelOf(body).citySlug, city);
      if (city === "manchester" && pathname === "/") {
        assert.equal(modelOf(body).editionRange, "October 22 – October 31, 2026");
      }
      if (city === "nyc" && pathname === "/") {
        assert.equal(modelOf(body).editionRange, "October 23 – October 31, 2026");
      }
      if (city === "dallas" && pathname === "/") {
        assert.equal(modelOf(body).editionRange, "October 23 – October 31, 2026");
      }
      const ethicsTitle = {
        houston: "Atlas of AI",
        tokyo: "Tokyo AI Adoption and Use Guidelines",
        stlouis: "Artificial Intelligence Policy",
        portland: "responsible use of AI",
        bulverde: "Data Feminism",
        dc: "Weapons of Math Destruction",
        nyc: "The Algorithm: How AI Decides Who Gets Hired",
        dallas: "Update on Artificial Intelligence: City AI Plan, Governance and Best Practices",
      }[city];
      if (ethicsTitle && pathname !== "/about") {
        assert.match(body, /AI Ethics/, `${city}${pathname} should include an AI Ethics section`);
        assert.ok(body.includes(ethicsTitle), `${city}${pathname} should include its local reading`);
        assert.match(body, /id="city-ai-ethics"/, `${city}${pathname} should expose the section anchor`);
      }
    }
    if (expected[city].startsWith("/images/")) {
      const { response } = await document(host, expected[city]);
      assert.equal(response.status, 200, `Image missing: ${city}`);
      assert.match(response.headers.get("content-type"), /^image\/(?:jpeg|png)/);
    }
  }
});
test("Leadership Austin shares its branded image in the initial document", async () => {
  const host = "leadershipaustin.irl.group";
  const image = `https://${host}/images/leadership-austin-share.png`;
  const { response, body } = await document(host, "/", "facebookexternalhit/1.1");
  assert.equal(response.status, 200);
  assert.ok(body.includes(`<meta property="og:image" content="${image}">`));
  assert.ok(body.includes(`<meta name="twitter:image" content="${image}">`));
  assert.match(body, /<meta name="twitter:card" content="summary_large_image">/);
  const asset = await document(host, "/images/leadership-austin-share.png");
  assert.equal(asset.response.status, 200);
  assert.match(asset.response.headers.get("content-type"), /^image\/png/);
});
test("Golf IRL leads Austin in the city directory", async () => {
  const { response, body } = await document("eventcarpooling.com");
  assert.equal(response.status, 200);
  const cities = modelOf(body).cities;
  assert.equal(cities[0].slug, "golf");
  assert.equal(cities[1].slug, "austin");
  assert.equal(cities[2].slug, "nyc");
  assert.equal(cities[3].slug, "dallas");
  assert.equal(cities[3].ethicsTitle, "Dallas AI Plan and governance briefing");
  assert.equal(cities[3].ethicsUrl, "https://dallascityhall.com/government/citymanager/Documents/Council%20Materials/C.%20Update%20on%20AI%20City%20AI%20Plan.pdf");
});
test("platform and future city image fallbacks never borrow Austin's preview", async () => {
  const { response, body } = await document("eventcarpooling.com");
  assert.equal(response.status, 200);
  assert.match(body, /og:image" content="https:\/\/irl\.group\/images\/irl-open-graph\.jpg"/);
  assert.doesNotMatch(body, /<html[^>]+data-tenant="austin"/);
  const ogImage = await document("eventcarpooling.com", "/images/irl-open-graph.jpg");
  assert.equal(ogImage.response.status, 200);
  assert.match(ogImage.response.headers.get("content-type"), /^image\/jpeg/);
  const { cityShareImage } = await import("../dist/server/entry-server.js");
  assert.equal(cityShareImage(null, "https://irl.group"),
    "https://irl.group/images/irl-open-graph.jpg");
  assert.equal(cityShareImage("futurecity", "https://futurecity.irl.group"),
    "https://futurecity.irl.group/images/irl-open-graph.jpg");
  assert.equal(cityShareImage("tokyo", "https://tokyo.irl.group").startsWith("https://images.unsplash.com/"), true);
  assert.equal(cityShareImage("portland", "https://preview.test", "/city-preview/"),
    "https://preview.test/city-preview/images/portland-hero.jpg");
});
test("Austin carpooling story stays local and no city uses legacy carpooling branding", async () => {
  for (const city of cities) {
    const paths = city === "austincares"
      ? ["/", "/full"]
      : ["/", `/digest/${fixture(city).id}`];
    for (const pathname of paths) {
      const { response, body } = await document(`${city}.irl.group`, pathname);
      assert.equal(response.status, 200, `${city}${pathname}`);
      const visibleHtml = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
      assert.match(visibleHtml, /src="\/images\/irl-monogram\.png"/, `${city}${pathname} IRL logo`);
      assert.doesNotMatch(visibleHtml, /eventcarpooling/i, `${city}${pathname}`);
      if (city === "austin") {
        assert.doesNotMatch(visibleHtml, /Why America Turned Blue\?/i, `${city}${pathname} removed AI Ethics article`);
        assert.match(visibleHtml, /What Texas Turning Blue Could Mean for Data Centers and the AI Industry in the U\.S\./i, `${city}${pathname} Texas data-center article`);
        assert.match(visibleHtml, /ibtimes\.com\/gina-hinojosa-texas-data-center-moratorium-ai-3809416/i, `${city}${pathname} IBTimes source`);
        assert.match(visibleHtml, /dumb carpooling idea/i, `${city}${pathname} Austin AI Ethics story`);
        assert.match(visibleHtml, /mashable\.com\/article\/irl-shuts-down-20-million-users-bots/i, `${city}${pathname} Mashable source`);
        assert.match(visibleHtml, /AI-generated slop and apps with outlandish claims/i, `${city}${pathname} IRL trust context`);
        assert.match(visibleHtml, /dot-com bust/i, `${city}${pathname} AI hype question`);
        assert.match(visibleHtml, /nytimes\.com\/video\/us\/politics\/100000011266333/i, `${city}${pathname} NYT video`);
        assert.match(visibleHtml, /Pflugerville adopts new policy for AI, surveillance technology and data privacy/i, `${city}${pathname} Pflugerville policy article`);
        assert.match(visibleHtml, /communityimpact\.com\/pflugerville-hutto\/government\/pflugerville-adopts-new-policy-for-ai-surveillance-technology-and-data-privacy/i, `${city}${pathname} Pflugerville source`);
        const texasArticlePosition = visibleHtml.indexOf("What Texas Turning Blue Could Mean for Data Centers and the AI Industry in the U.S.");
        const nytVideoPosition = visibleHtml.indexOf("Gina Hinojosa on data centers and immigration");
        const pflPagePosition = visibleHtml.indexOf("Pflugerville adopts new policy for AI, surveillance technology and data privacy");
        const austinCarpoolPosition = visibleHtml.indexOf("dumb carpooling idea");
        assert.ok(texasArticlePosition >= 0 && nytVideoPosition > texasArticlePosition, `${city}${pathname} NYT video follows Texas data-center article`);
        assert.ok(pflPagePosition > nytVideoPosition && austinCarpoolPosition > pflPagePosition, `${city}${pathname} Pflugerville article follows NYT video and precedes Austin carpool story`);
        assert.match(visibleHtml, /commercial and nonprofit pilots to help fine-tune the project/i, `${city}${pathname} current IRL.group pilot context`);
        assert.doesNotMatch(visibleHtml, /Texas data-center governance, permits, and air quality|We are telling AI chatbots our biggest secrets|Meta's AI shopping agent threatens Amazon|Proton's CTO wrote a manifesto|Spurs² Hackathon|Why Every Election Matters to Democracy with Stacey Abrams/i, `${city}${pathname} stale AI Ethics items`);
      } else {
        assert.doesNotMatch(visibleHtml, /carpool/i, `${city}${pathname}`);
      }
    }
  }
});
test("Austin framing is date-free while event dates and city labels remain readable", async () => {
  for (const pathname of ["/", `/digest/${fixture("austin").id}`]) {
    const { body } = await document("austin.eventcarpooling.com", pathname);
    const visible = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    assert.match(visible, /Upcoming events/);
    assert.match(visible, /Oct 12, 2031/);
    assert.doesNotMatch(visible, /Week of /);
    assert.match(visible, />Atlanta Events<\/a>/);
    assert.doesNotMatch(visible, /Events events/);
  }
  const { body } = await document("eventcarpooling.com");
  assert.equal((body.match(/>Atlanta Events<\/a>/g) || []).length, 2);
  assert.doesNotMatch(body, /Atlanta Events events/);
});
test("event identities load newest content, canonical metadata and verified JSON-LD", async () => {
  const { response, body } = await document("austin.eventcarpooling.com", `/events/${eventId("austin")}/outdated-slug`);
  assert.equal(response.status, 200);
  const model = modelOf(body);
  assert.equal(model.event.title, "austin test community talk");
  assert.match(model.canonical, /austin-test-community-talk$/);
  const schema = JSON.parse(body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(schema["@type"], "Event");
  assert.equal(schema.name, model.event.title);
  assert.equal(schema.startDate, model.event.startDate);
  assert.equal(schema.location.address.streetAddress, "1 Test Street");
  assert.equal(schema.offers, undefined);
  assert.match(body, /Verified start/);
  assert.match(body, /og:image/);
});
test("venue pages link real listed events and do not invent travel amenities", async () => {
  const id = venueIdentity("austin", "austin test hall");
  const { response, body } = await document("austin.eventcarpooling.com", `/venues/${id}/austin-test-hall`);
  assert.equal(response.status, 200);
  assert.equal(modelOf(body).kind, "venue");
  assert.match(body, new RegExp(`/events/${eventId("austin")}/`));
  assert.match(body, /organizer|source|official/i);
});
test("AustinCares retains curated and approved community offers, never Event URLs", async () => {
  const { response, body } = await document("austincares.eventcarpooling.com");
  assert.equal(response.status, 200);
  assert.match(body, /Spokesman Coffee/);
  assert.match(body, /Test approved community offer/);
  const model = modelOf(body);
  assert.equal(model.kind, "deals");
  assert.ok(model.events.every(e => !e.url));
  assert.equal(model.schema, undefined);
});
test("robots and sitemaps have correct formats and exclude private links and posts", async () => {
  for (const host of ["eventcarpooling.com", "austin.eventcarpooling.com", "tokyo.eventcarpooling.com", "austincares.eventcarpooling.com"]) {
    const robots = await document(host, "/robots.txt");
    assert.equal(robots.response.status, 200);
    assert.match(robots.response.headers.get("content-type"), /^text\/plain/);
    assert.match(robots.body, /Disallow: \/rsvp/);
    const xml = await document(host, "/sitemap.xml");
    assert.equal(xml.response.status, 200);
    assert.match(xml.response.headers.get("content-type"), /^application\/xml/);
    assert.match(xml.body, /^<\?xml/);
    assert.doesNotMatch(xml.body, /<loc>[^<]*(?:\/admin|\/rsvp|email=|token=|000000000000000000000090)/);
  }
  const leadershipSitemap = await document("leadershipaustin.irl.group", "/sitemap.xml");
  assert.equal(leadershipSitemap.response.status, 200);
  assert.match(leadershipSitemap.body, /https:\/\/leadershipaustin\.irl\.group\/toys-for-tots/);
});
test("unknown tenants, missing resources and post-only event URLs return real 404s", async () => {
  for (const [host, path] of [
    ["missing.eventcarpooling.com", "/"], ["missing.eventcarpooling.com", "/admin"],
    ["austin.eventcarpooling.com", "/digest/99999"], ["austin.eventcarpooling.com", "/unknown-route"],
    ["austin.eventcarpooling.com", "/events/ev-000000000000000000000090/spotlight"],
    ["tokyo.eventcarpooling.com", `/events/${eventId("austin")}/wrong-city`],
  ]) assert.equal((await document(host, path)).response.status, 404, `${host}${path}`);
});
test("personalized and admin documents are noindex and never disclose query secrets", async () => {
  for (const path of ["/admin", "/rsvp?email=private%40example.test&sig=test-secret", "/?email=private%40example.test"]) {
    const { response, body } = await document("austin.eventcarpooling.com", path);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("x-robots-tag"), /noindex/);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.doesNotMatch(body, /private@|private%40|test-secret/);
  }
});
test("legacy domain permanently redirects root and city hosts while preserving path and query", async () => {
  const query = "?email=reader%2Btag%40example.test&sig=test-signature&title=A%26B";
  const rootRedirect = await rawDocument("eventcarpooling.com", "/rsvp" + query);
  assert.equal(rootRedirect.response.status, 301);
  assert.equal(rootRedirect.response.headers.get("location"), "https://irl.group/rsvp" + query);
  const wwwRedirect = await rawDocument("www.eventcarpooling.com", "/about/?from=old");
  assert.equal(wwwRedirect.response.status, 301);
  assert.equal(wwwRedirect.response.headers.get("location"), "https://irl.group/about/?from=old");
  const cityRedirect = await rawDocument("austin.eventcarpooling.com", "/digest/12?ref=old");
  assert.equal(cityRedirect.response.status, 301);
  assert.equal(cityRedirect.response.headers.get("location"), "https://austin.irl.group/digest/12?ref=old");
  for (const slug of cities) {
    const redirect = await rawDocument(`${slug}.eventcarpooling.com`, "/");
    assert.equal(redirect.response.status, 301, `${slug} should permanently redirect`);
    assert.equal(redirect.response.headers.get("location"), `https://${slug}.irl.group/`, `${slug} should redirect to its matching IRL host`);
  }
  const assetRedirect = await rawDocument("tokyo.eventcarpooling.com", "/assets/app.js?v=2");
  assert.equal(assetRedirect.response.status, 301);
  assert.equal(assetRedirect.response.headers.get("location"), "https://tokyo.irl.group/assets/app.js?v=2");
  const signedRsvp = await document("irl.group", "/rsvp" + query);
  assert.equal(signedRsvp.response.status, 302);
  assert.equal(signedRsvp.response.headers.get("location"), "https://austin.irl.group/rsvp" + query);
  const slash = await document("austin.eventcarpooling.com", "/about/");
  assert.equal(slash.response.status, 301);
  assert.equal(slash.response.headers.get("location"), "/about");
});
test("ordinary readers and crawler user agents receive identical content", async () => {
  const human = await document("austin.eventcarpooling.com");
  const crawler = await document("austin.eventcarpooling.com", "/", "Googlebot");
  assert.equal(human.body, crawler.body);
});
test("updates are fresh, JSON is escaped and backend failures are honest 503s", async () => {
  intro = 'Updated fixture </script><script>alert("fixture")</script>';
  const updated = await document("austin.eventcarpooling.com");
  assert.equal(modelOf(updated.body).intro, intro);
  assert.doesNotMatch(updated.body, /<script>alert\(/);
  intro = null; failed = true;
  try {
    const unavailable = await document("austin.eventcarpooling.com");
    assert.equal(unavailable.response.status, 503);
    assert.match(unavailable.body, /Temporarily unavailable/);
    assert.equal(unavailable.response.headers.get("cache-control"), "no-store");
  } finally { failed = false; }
});
