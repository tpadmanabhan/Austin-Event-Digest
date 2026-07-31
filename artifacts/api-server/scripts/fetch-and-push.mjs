/**
 * fetch-and-push.mjs  — plain Node.js (ESM)
 * Runs Eventbrite + Ticketmaster scrapers directly and PATCHes results into production digests.
 * node artifacts/api-server/scripts/fetch-and-push.mjs
 */
import { createHmac } from "crypto";

// ── City slug map for Eventbrite ─────────────────────────────────────────────
const CITY_SLUG = {
  "Austin, TX":      "tx--austin",
  "Austin Cares":    "tx--austin",
  "Sacramento, CA":  "ca--sacramento",
  "Portland, OR":    "or--portland",
  "Bulverde, TX":    "tx--san-antonio",
  "St. Louis, MO":   "mo--st-louis",
};

// Eventbrite category-path keywords
const CATEGORY_PATHS = {
  Tech:             ["tech--events"],
  Music:            ["music--events"],
  Food:             ["food--events"],
  Wellness:         ["fitness--events"],
  Civics:           ["community--events"],
  Arts:             ["arts--events"],
  Sports:           ["sports--events"],
};

// ── Tenant config ─────────────────────────────────────────────────────────────
const TENANTS = [
  { subdomain: "austincares", city: "Austin, TX",     digestId: 85, weekOf: "2026-07-27", weekEnd: "2026-08-02",
    passwordHash: "da297117bd280d438b4082b00b0b0159d2024bbfaa643509f07e2e4ecb8a1febd3f49f9b8da2ad15e52086092b686c81e506cb9a1b4bbeaaed0d69d62cc98d95:093f8368e18871dbd11b9afe9b832970" },
  { subdomain: "sacramento",  city: "Sacramento, CA", digestId: 77, weekOf: "2026-07-26", weekEnd: "2026-08-01",
    passwordHash: "dfd88f4cf97acdb339541d35c18dc5d5b63d8156987d09ada1bd0e2d0d59c720d3a9dc7fc9f3b0c719ebcdcbb1616426f83a8e1931b418c08d94c00f1238f56d:34de22808925446d571bcbd38ed5dc56" },
  { subdomain: "portland",    city: "Portland, OR",   digestId: 71, weekOf: "2026-07-26", weekEnd: "2026-08-01",
    passwordHash: "7af356df13f43e6b5052fcdb53685d56f094934c645235c7063120eecd526c2cef55cae6802083eeb77b4ec17ba18e42e0f135822b62fa3d39b0d8a659d1b3f4:9ff84c03e62e7101770cbf036df75eb8" },
  { subdomain: "bulverde",    city: "Bulverde, TX",   digestId: 81, weekOf: "2026-07-26", weekEnd: "2026-08-01",
    passwordHash: "e93382132390c96a7f24d27f21aacb08e3f70eba1fc555e69084bd15f7a90a4ade775c48a544880402b5f0b3d6eb4173a7fa7204648603d1881706bedbb40587:b32fb2673c07b8a661330426eeed8bfe" },
  { subdomain: "stlouis",     city: "St. Louis, MO",  digestId: 87, weekOf: "2026-08-02", weekEnd: "2026-08-08",
    passwordHash: "9d0832717c9df457ca033d96018c1efa68a6a718e09d6ff125a23df8912d6757f0755fbb4b8297a2a90ff5544322d37c6d6f5944617631412099170ea9653588:d159f509ac83fbf04fd7dd77f37ef4d0" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function adminToken(hash) {
  return createHmac("sha256", hash).update("admin-session").digest("hex");
}

function isWithinRange(isoStr, weekOf, weekEnd) {
  const d = new Date(isoStr);
  const start = new Date(weekOf + "T00:00:00Z");
  const end   = new Date(weekEnd + "T23:59:59Z");
  return d >= start && d <= end;
}

function guessCategory(text) {
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

function formatDate(isoStr, tz = "America/Chicago") {
  try {
    const d = new Date(isoStr);
    const weekday = d.toLocaleDateString("en-US", { weekday: "long", timeZone: tz });
    const month   = d.toLocaleDateString("en-US", { month: "short", timeZone: tz });
    const day     = d.toLocaleDateString("en-US", { day: "numeric", timeZone: tz });
    const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
    return `${weekday}, ${month} ${day} at ${timeStr}`;
  } catch {
    return isoStr.substring(0, 10);
  }
}

function decodeHtml(str) {
  if (!str) return null;
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

const FETCH_OPTS = {
  headers: {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  },
  signal: AbortSignal.timeout(14000),
};

// ── Eventbrite scraper ────────────────────────────────────────────────────────
async function scrapeEventbritePage(url, weekOf, weekEnd, tz) {
  let html;
  try {
    const res = await fetch(url, FETCH_OPTS);
    if (!res.ok) return [];
    html = await res.text();
  } catch { return []; }

  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)]
    .map(m => { try { return JSON.parse(m[1]); } catch { return null; } })
    .filter(Boolean);

  const rawEvents = blocks.flatMap(j => {
    if (j.itemListElement) return j.itemListElement.map(el => el.item || el);
    if (j["@type"] === "Event") return [j];
    return [];
  }).filter(e => e?.["@type"] === "Event" && e.name && e.startDate);

  const events = [];
  for (const ev of rawEvents) {
    const iso = ev.startDate.includes("T") ? ev.startDate : `${ev.startDate}T19:00:00Z`;
    if (!isWithinRange(iso, weekOf, weekEnd)) continue;
    const venue = ev.location?.name || ev.location?.address?.addressLocality || "";
    events.push({
      title: ev.name.trim(),
      date: formatDate(iso, tz),
      venue: venue.substring(0, 120),
      description: (ev.description || `${ev.name} — ${venue}`).substring(0, 400),
      category: guessCategory(`${ev.name} ${ev.description || ""}`),
      link: decodeHtml(ev.url) || null,
      imageUrl: decodeHtml(typeof ev.image === "string" ? ev.image : ev.image?.url) || null,
      source: "Eventbrite",
    });
  }
  return events;
}

async function fetchEventbrite(city, weekOf, weekEnd) {
  const slug = CITY_SLUG[city];
  if (!slug) return [];
  const tz = city.includes("Portland") ? "America/Los_Angeles"
           : city.includes("Sacramento") ? "America/Los_Angeles"
           : city.includes("Louis") ? "America/Chicago"
           : "America/Chicago";

  const allCategories = Object.keys(CATEGORY_PATHS);
  const results = await Promise.allSettled(
    allCategories.flatMap(cat =>
      CATEGORY_PATHS[cat].map(kw => {
        const url = `https://www.eventbrite.com/d/${slug}/${kw}--this-week/`;
        return scrapeEventbritePage(url, weekOf, weekEnd, tz);
      })
    )
  );

  const seen = new Set();
  const events = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      for (const ev of r.value) {
        const key = ev.title.toLowerCase().replace(/\s+/g, "").substring(0, 40);
        if (!seen.has(key)) { seen.add(key); events.push(ev); }
      }
    }
  }
  return events;
}

// ── Ticketmaster ──────────────────────────────────────────────────────────────
const TM_CLASSIFICATIONS = ["Music", "Arts & Theatre", "Sports"];

async function fetchTicketmaster(city, weekOf, weekEnd) {
  const apiKey = process.env.TICKETMASTER_API_KEY?.trim();
  if (!apiKey) return [];

  const [cityName, stateCode] = city.split(",").map(s => s.trim());
  const tz = city.includes("Portland") || city.includes("Sacramento") ? "America/Los_Angeles"
           : city.includes("Louis") ? "America/Chicago"
           : "America/Chicago";

  const allEvents = [];
  const seen = new Set();

  await Promise.allSettled(TM_CLASSIFICATIONS.map(async cls => {
    const params = new URLSearchParams({
      apikey: apiKey,
      city: cityName,
      size: "30",
      sort: "date,asc",
      classificationName: cls,
      startDateTime: new Date(weekOf + "T00:00:00Z").toISOString().replace(/\.\d{3}Z$/, "Z"),
      endDateTime:   new Date(weekEnd + "T23:59:59Z").toISOString().replace(/\.\d{3}Z$/, "Z"),
    });
    if (stateCode) params.set("stateCode", stateCode);

    try {
      const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return;
      const data = await res.json();
      if (data.fault) return;  // invalid key
      for (const ev of data._embedded?.events ?? []) {
        const startIso = ev.dates?.start?.dateTime || (ev.dates?.start?.localDate ? `${ev.dates.start.localDate}T19:00:00Z` : null);
        if (!startIso) continue;
        const venue = ev._embedded?.venues?.[0];
        const venueName = [venue?.name, venue?.city?.name || cityName].filter(Boolean).join(", ");
        const image = ev.images?.find(i => i.ratio === "16_9" && (i.width || 0) > 500)?.url || ev.images?.[0]?.url || null;
        const key = ev.name.toLowerCase().replace(/\s+/g, "").substring(0, 40);
        if (seen.has(key)) continue;
        seen.add(key);
        allEvents.push({
          title: ev.name.trim(),
          date: formatDate(startIso, tz),
          venue: venueName.substring(0, 120),
          description: (ev.description || ev.info || `${ev.name} at ${venueName}`).substring(0, 400),
          category: guessCategory(`${ev.name} ${cls}`),
          link: ev.url || null,
          imageUrl: image,
          source: "Ticketmaster",
        });
      }
    } catch { /* ignore per-classification errors */ }
  }));

  return allEvents;
}

// ── Production API helpers ────────────────────────────────────────────────────
async function getCurrentEvents(subdomain, token, digestId) {
  const res = await fetch(`https://${subdomain}.eventcarpooling.com/api/events/digest/list`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) });
  const list = await res.json();
  const digest = list.find(d => d.id === digestId);
  return digest?.events ?? [];
}

async function patchDigest(subdomain, token, digestId, events) {
  const res = await fetch(`https://${subdomain}.eventcarpooling.com/api/events/digest/${digestId}/events`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
    signal: AbortSignal.timeout(12000),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${body.substring(0, 120)}`);
  return JSON.parse(body);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const tmKey = process.env.TICKETMASTER_API_KEY?.trim() || "";
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Event fetch-and-push  |  TM key: ${tmKey ? `SET (${tmKey.length} chars)` : "MISSING"}`);
  console.log("=".repeat(60));

  // Quick TM key validation
  let tmActive = false;
  if (tmKey) {
    try {
      const r = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?apikey=${tmKey}&city=Austin&size=1`, { signal: AbortSignal.timeout(8000) });
      const d = await r.json();
      tmActive = !d.fault;
      console.log(`Ticketmaster key: ${tmActive ? "✅ ACTIVE" : "❌ still invalid"}`);
    } catch { console.log("Ticketmaster key: ❌ test failed"); }
  }

  for (const tenant of TENANTS) {
    console.log(`\n── ${tenant.subdomain.toUpperCase()} (digest ${tenant.digestId}, weekOf ${tenant.weekOf}) ──`);
    const token = adminToken(tenant.passwordHash);

    // Get existing events
    let existing = [];
    try {
      existing = await getCurrentEvents(tenant.subdomain, token, tenant.digestId);
      console.log(`  Existing: ${existing.length} events`);
    } catch (e) { console.log(`  Could not fetch existing: ${e.message}`); }

    // Run adapters in parallel
    console.log(`  Scraping Eventbrite...`);
    const [ebEvents, tmEvents] = await Promise.all([
      fetchEventbrite(tenant.city, tenant.weekOf, tenant.weekEnd),
      tmActive ? fetchTicketmaster(tenant.city, tenant.weekOf, tenant.weekEnd) : Promise.resolve([]),
    ]);

    console.log(`  Eventbrite: ${ebEvents.length} events`);
    if (tmActive) console.log(`  Ticketmaster: ${tmEvents.length} events`);

    const allNew = [...ebEvents, ...tmEvents];
    if (allNew.length === 0) {
      console.log(`  ⚠ No new events scraped — skipping`);
      continue;
    }

    // Deduplicate merge
    const seen = new Set(existing.map(e => e.title.toLowerCase().replace(/\s+/g, "").substring(0, 40)));
    const toAdd = allNew.filter(e => {
      const key = e.title.toLowerCase().replace(/\s+/g, "").substring(0, 40);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const merged = [...existing, ...toAdd];
    console.log(`  Net new: ${toAdd.length} | Total after merge: ${merged.length}`);

    if (toAdd.length === 0) {
      console.log(`  ✓ No duplicates to add`);
      continue;
    }

    try {
      await patchDigest(tenant.subdomain, token, tenant.digestId, merged);
      console.log(`  ✅ Patched → ${merged.length} events in digest ${tenant.digestId}`);
    } catch (e) {
      console.log(`  ❌ PATCH failed: ${e.message}`);
    }
  }

  console.log(`\n${"=".repeat(60)}\nDone.\n`);
}

main().catch(console.error);
