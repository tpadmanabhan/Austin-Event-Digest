import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import net from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolveSite, eventSchema, validIsoDate, venueIdentity, publicApiOrigin } from "./public-model.mjs";

const cities = ["austin", "atlanta", "tokyo", "austincares", "sanfrancisco"];
const tenants = cities.map((slug, i) => ({ slug, id: i + 1, name: slug === "atlanta" ? "Atlanta Events" : `${slug} community`, city: slug }));
const eventId = city => `ev-${String(cities.indexOf(city) + 1).padStart(24, "0")}`;
const fixture = city => ({
  id: cities.indexOf(city) + 10, weekOf: "2031-10-12T00:00:00.000Z", subject: `${city} test edition`, intro: "A test newsletter introduction.",
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
    if (!cities.includes(city) && host !== "eventcarpooling.com") { res.writeHead(404); return res.end("{}"); }
    if (req.url === "/api/tenants/list") return res.end(JSON.stringify({ tenants }));
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
  const response = await fetch(base + pathname, { headers: { Host: host, "X-Forwarded-Host": host, "User-Agent": userAgent }, redirect: "manual" });
  return { response, body: await response.text() };
}
const modelOf = body => JSON.parse(body.match(/<script id="public-document" type="application\/json">([\s\S]*?)<\/script>/)[1]);

test("host resolution never defaults an unknown production host to Austin", () => {
  assert.equal(resolveSite("unrelated.example", false), null);
  assert.equal(resolveSite("tokyo.eventcarpooling.com", false).slug, "tokyo");
  assert.equal(resolveSite("eventcarpooling.com", false).slug, null);
});
test("published API requests never default to the development-only port-80 proxy", () => {
  assert.equal(publicApiOrigin({ NODE_ENV: "production" }), "https://eventcarpooling.com");
  assert.equal(publicApiOrigin({ NODE_ENV: "development" }), "http://127.0.0.1:80");
  assert.equal(publicApiOrigin({ NODE_ENV: "production", INTERNAL_API_ORIGIN: "http://127.0.0.1:9000" }), "http://127.0.0.1:9000");
});
test("verified date validation rejects guessed years, impossible days and missing offsets", () => {
  assert.equal(validIsoDate("October 12 at noon"), false);
  assert.equal(validIsoDate("2031-02-30"), false);
  assert.equal(validIsoDate("2031-10-12T12:00:00"), false);
  assert.equal(validIsoDate("2031-10-12T12:00:00.000Z"), true);
  assert.equal(validIsoDate("2031-10-12"), true);
  assert.equal(eventSchema({ ...fixture("austin").events[0], startDate: undefined }, "https://austin.eventcarpooling.com"), undefined);
});
test("the platform document is readable and has real city links without scripts running", async () => {
  const { response, body } = await document("eventcarpooling.com");
  assert.equal(response.status, 200);
  assert.match(body, /Find local events and connect with your community/);
  assert.match(body, /https:\/\/tokyo\.eventcarpooling\.com\//);
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
  for (const city of ["austin", "atlanta", "tokyo", "sanfrancisco"]) {
    const { response, body } = await document(`${city}.eventcarpooling.com`);
    assert.equal(response.status, 200);
    assert.match(body, new RegExp(`${city} test community talk`));
    assert.equal(modelOf(body).citySlug, city);
    const edition = await document(`${city}.eventcarpooling.com`, `/digest/${fixture(city).id}`);
    assert.equal(edition.response.status, 200);
    assert.equal(modelOf(edition.body).kind, "digest");
  }
});
test("San Francisco shares its Golden Gate image in initial homepage and edition HTML", async () => {
  const host = "sanfrancisco.eventcarpooling.com";
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
  const austin = await document("austin.eventcarpooling.com");
  assert.match(austin.body, /<meta property="og:image" content="https:\/\/austin\.eventcarpooling\.com\/opengraph\.jpg">/);
});
test("edition dates are readable and city labels do not repeat events", async () => {
  for (const pathname of ["/", `/digest/${fixture("austin").id}`]) {
    const { body } = await document("austin.eventcarpooling.com", pathname);
    const visible = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    assert.match(visible, /Week of October 12, 2031/);
    assert.doesNotMatch(visible, /Week of 2031-10-12T/);
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
test("legacy redirects preserve exact signed URL input and canonical trailing slash", async () => {
  const query = "?email=reader%2Btag%40example.test&sig=test-signature&title=A%26B";
  const redirect = await document("eventcarpooling.com", "/rsvp" + query);
  assert.equal(redirect.response.status, 302);
  assert.equal(redirect.response.headers.get("location"), "https://austin.eventcarpooling.com/rsvp" + query);
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
