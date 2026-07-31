/**
 * fetch-and-push.mjs  — plain Node.js (ESM)
 * Runs Eventbrite + Ticketmaster scrapers and PATCHes results into production digests.
 * Covers current week (7/26–8/1) + next week (8/2–8/8).
 * Events on 8/2+ are tagged featured:true (Special Events).
 * Past events (before today) are dropped from existing lists.
 *
 * node artifacts/api-server/scripts/fetch-and-push.mjs
 */
import { createHmac } from "crypto";

// ── Date constants ────────────────────────────────────────────────────────────
const TODAY_ISO      = "2026-07-31";   // events before this date are past
const NEXT_WEEK_ISO  = "2026-08-02";   // events on/after this are "special"
const RANGE_START    = "2026-07-31T00:00:00Z";
const RANGE_END      = "2026-08-08T23:59:59Z";

// ── City slug map for Eventbrite ─────────────────────────────────────────────
const EB_SLUG = {
  "Austin, TX":      "tx--austin",
  "Austin Cares":    "tx--austin",
  "Sacramento, CA":  "ca--sacramento",
  "Portland, OR":    "or--portland",
  "San Antonio, TX": "tx--san-antonio",
  "St. Louis, MO":   "mo--st-louis",
};

const CATEGORY_PATHS = {
  Tech:     ["tech--events"],
  Music:    ["music--events"],
  Food:     ["food--events"],
  Wellness: ["fitness--events"],
  Civics:   ["community--events"],
  Arts:     ["arts--events"],
  Sports:   ["sports--events"],
};

// ── Tenant config ─────────────────────────────────────────────────────────────
// tmCity: city/state used for Ticketmaster lookups (defaults to city)
const TENANTS = [
  {
    subdomain: "austincares", city: "Austin, TX", digestId: 85,
    tz: "America/Chicago",
    passwordHash: "da297117bd280d438b4082b00b0b0159d2024bbfaa643509f07e2e4ecb8a1febd3f49f9b8da2ad15e52086092b686c81e506cb9a1b4bbeaaed0d69d62cc98d95:093f8368e18871dbd11b9afe9b832970",
  },
  {
    subdomain: "sacramento", city: "Sacramento, CA", digestId: 77,
    tz: "America/Los_Angeles",
    passwordHash: "dfd88f4cf97acdb339541d35c18dc5d5b63d8156987d09ada1bd0e2d0d59c720d3a9dc7fc9f3b0c719ebcdcbb1616426f83a8e1931b418c08d94c00f1238f56d:34de22808925446d571bcbd38ed5dc56",
  },
  {
    subdomain: "portland", city: "Portland, OR", digestId: 71,
    tz: "America/Los_Angeles",
    passwordHash: "7af356df13f43e6b5052fcdb53685d56f094934c645235c7063120eecd526c2cef55cae6802083eeb77b4ec17ba18e42e0f135822b62fa3d39b0d8a659d1b3f4:9ff84c03e62e7101770cbf036df75eb8",
  },
  {
    subdomain: "bulverde", city: "Bulverde, TX", tmCity: "San Antonio, TX", digestId: 81,
    tz: "America/Chicago",
    passwordHash: "e93382132390c96a7f24d27f21aacb08e3f70eba1fc555e69084bd15f7a90a4ade775c48a544880402b5f0b3d6eb4173a7fa7204648603d1881706bedbb40587:b32fb2673c07b8a661330426eeed8bfe",
  },
  {
    subdomain: "stlouis", city: "St. Louis, MO", digestId: 87,
    tz: "America/Chicago",
    passwordHash: "9d0832717c9df457ca033d96018c1efa68a6a718e09d6ff125a23df8912d6757f0755fbb4b8297a2a90ff5544322d37c6d6f5944617631412099170ea9653588:d159f509ac83fbf04fd7dd77f37ef4d0",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function adminToken(hash) {
  return createHmac("sha256", hash).update("admin-session").digest("hex");
}

/** Is the event ISO date within our two-week fetch window? */
function isWithinRange(isoStr) {
  const d = new Date(isoStr);
  return d >= new Date(RANGE_START) && d <= new Date(RANGE_END);
}

/** Should this ISO date be tagged as a Special Event (next week)? */
function isSpecial(isoStr) {
  return new Date(isoStr) >= new Date(NEXT_WEEK_ISO + "T00:00:00Z");
}

/** Parse human-readable date strings like "Saturday, Aug 1 at 8:00 PM" → Date */
const MONTHS = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
function parseDateString(str) {
  if (!str) return null;
  const m = str.match(/([A-Z][a-z]+)\s+(\d+)\s+at\s+(\d+):(\d+)\s+(AM|PM)/i);
  if (!m) return null;
  const [, month, day, hours, minutes, ampm] = m;
  const mo = MONTHS[month];
  if (mo === undefined) return null;
  let h = parseInt(hours, 10);
  if (ampm.toUpperCase() === "PM" && h !== 12) h += 12;
  if (ampm.toUpperCase() === "AM" && h === 12) h = 0;
  return new Date(2026, mo, parseInt(day, 10), h, parseInt(minutes, 10));
}

/** Keep only events whose date is today or in the future */
function filterPastEvents(events) {
  const cutoff = new Date(TODAY_ISO + "T00:00:00");
  return events.filter(ev => {
    const d = parseDateString(ev.date);
    if (!d) return true; // can't parse → keep to be safe
    return d >= cutoff;
  });
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
async function scrapeEventbritePage(url, tz) {
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
    if (!isWithinRange(iso)) continue;
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
      ...(isSpecial(iso) ? { featured: true } : {}),
    });
  }
  return events;
}

async function fetchEventbrite(city, tz) {
  const slug = EB_SLUG[city];
  if (!slug) return [];
  const allCategories = Object.keys(CATEGORY_PATHS);
  const results = await Promise.allSettled(
    allCategories.flatMap(cat =>
      CATEGORY_PATHS[cat].map(kw =>
        scrapeEventbritePage(`https://www.eventbrite.com/d/${slug}/${kw}--this-week/`, tz)
      )
    )
  );
  const seen = new Set();
  const events = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const ev of r.value) {
      const key = ev.title.toLowerCase().replace(/\s+/g, "").substring(0, 40);
      if (!seen.has(key)) { seen.add(key); events.push(ev); }
    }
  }
  return events;
}

// ── Ticketmaster ──────────────────────────────────────────────────────────────
const TM_CLASSIFICATIONS = ["Music", "Arts & Theatre", "Sports"];

async function fetchTicketmaster(tmCity, tz) {
  const apiKey = process.env.TICKETMASTER_API_KEY?.trim();
  if (!apiKey) return [];

  const [cityName, stateCode] = tmCity.split(",").map(s => s.trim());
  const allEvents = [];
  const seen = new Set();

  await Promise.allSettled(TM_CLASSIFICATIONS.map(async cls => {
    const params = new URLSearchParams({
      apikey: apiKey,
      city: cityName,
      size: "30",
      sort: "date,asc",
      classificationName: cls,
      startDateTime: RANGE_START.replace("Z", "Z"),
      endDateTime:   RANGE_END.replace(" ", "T"),
    });
    if (stateCode) params.set("stateCode", stateCode);

    try {
      const res = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events.json?${params}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.fault) return;
      for (const ev of data._embedded?.events ?? []) {
        const startIso = ev.dates?.start?.dateTime
          || (ev.dates?.start?.localDate ? `${ev.dates.start.localDate}T19:00:00Z` : null);
        if (!startIso || !isWithinRange(startIso)) continue;
        const venue = ev._embedded?.venues?.[0];
        const venueName = [venue?.name, venue?.city?.name || cityName].filter(Boolean).join(", ");
        const image = ev.images?.find(i => i.ratio === "16_9" && (i.width || 0) > 500)?.url
          || ev.images?.[0]?.url || null;
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
          ...(isSpecial(startIso) ? { featured: true } : {}),
        });
      }
    } catch { /* ignore per-classification errors */ }
  }));

  return allEvents;
}

// ── Production API helpers ────────────────────────────────────────────────────
async function getCurrentEvents(subdomain, token, digestId) {
  const res = await fetch(
    `https://${subdomain}.eventcarpooling.com/api/events/digest/list`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) }
  );
  const body = await res.json();
  const digests = Array.isArray(body) ? body : (body.digests ?? []);
  const digest = digests.find(d => d.id === digestId);
  return digest?.events ?? [];
}

async function patchDigest(subdomain, token, digestId, events) {
  const res = await fetch(
    `https://${subdomain}.eventcarpooling.com/api/events/digest/${digestId}/events`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
      signal: AbortSignal.timeout(12000),
    }
  );
  const bodyText = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${bodyText.substring(0, 120)}`);
  return JSON.parse(bodyText);
}

/** Trigger server-side geocoding for any events missing lat/lng (fire-and-forget) */
async function triggerGeocode(subdomain, token, digestId) {
  try {
    const res = await fetch(
      `https://${subdomain}.eventcarpooling.com/api/events/digest/${digestId}/regeocoded`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      }
    );
    const body = await res.json();
    console.log(`  📍 Geocoding started: ${body.message || "ok"}`);
  } catch (e) {
    console.log(`  ⚠ Geocode trigger failed: ${e.message}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const tmKey = process.env.TICKETMASTER_API_KEY?.trim() || "";
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Event fetch-and-push`);
  console.log(`Range: ${TODAY_ISO} → 2026-08-08  |  Special events start: ${NEXT_WEEK_ISO}`);
  console.log("=".repeat(60));

  let tmActive = false;
  if (tmKey) {
    try {
      const r = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${tmKey}&city=Austin&size=1`,
        { signal: AbortSignal.timeout(8000) }
      );
      const d = await r.json();
      tmActive = !d.fault;
      console.log(`Ticketmaster key: ${tmActive ? "✅ ACTIVE" : "❌ still invalid"}`);
    } catch { console.log("Ticketmaster key: ❌ test failed"); }
  } else {
    console.log("Ticketmaster key: ⚠ not set");
  }

  for (const tenant of TENANTS) {
    const tmCity = tenant.tmCity || tenant.city;
    console.log(`\n── ${tenant.subdomain.toUpperCase()} (digest ${tenant.digestId})${tmCity !== tenant.city ? `  [TM city: ${tmCity}]` : ""} ──`);
    const token = adminToken(tenant.passwordHash);

    // Fetch existing events, drop ones that are now past
    let existing = [];
    try {
      const raw = await getCurrentEvents(tenant.subdomain, token, tenant.digestId);
      existing = filterPastEvents(raw);
      const dropped = raw.length - existing.length;
      console.log(`  Existing: ${raw.length} events${dropped > 0 ? ` (dropped ${dropped} past)` : ""}`);
    } catch (e) {
      console.log(`  Could not fetch existing: ${e.message}`);
    }

    // Fetch new events in parallel
    console.log(`  Fetching new events (Eventbrite + Ticketmaster)...`);
    const [ebEvents, tmEvents] = await Promise.all([
      fetchEventbrite(tmCity, tenant.tz),
      tmActive ? fetchTicketmaster(tmCity, tenant.tz) : Promise.resolve([]),
    ]);

    console.log(`  Eventbrite: ${ebEvents.length} | Ticketmaster: ${tmEvents.length}`);

    const allNew = [...ebEvents, ...tmEvents];

    // Dedup-merge: existing wins for same title
    const seen = new Set(
      existing.map(e => e.title.toLowerCase().replace(/\s+/g, "").substring(0, 40))
    );
    const toAdd = allNew.filter(e => {
      const key = e.title.toLowerCase().replace(/\s+/g, "").substring(0, 40);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Also tag existing next-week events as featured if they aren't already
    const updatedExisting = existing.map(ev => {
      const d = parseDateString(ev.date);
      if (d && d >= new Date(NEXT_WEEK_ISO) && !ev.featured) {
        return { ...ev, featured: true };
      }
      return ev;
    });

    const merged = [...updatedExisting, ...toAdd];
    const specialCount = merged.filter(e => e.featured).length;
    console.log(`  Net new: ${toAdd.length} | Total: ${merged.length} (${specialCount} special/featured)`);

    if (toAdd.length === 0 && JSON.stringify(existing) === JSON.stringify(updatedExisting)) {
      console.log(`  ✓ Nothing changed — triggering geocode for any missing pins`);
      await triggerGeocode(tenant.subdomain, token, tenant.digestId);
      continue;
    }

    try {
      await patchDigest(tenant.subdomain, token, tenant.digestId, merged);
      console.log(`  ✅ Patched → ${merged.length} events in digest ${tenant.digestId}`);
      await triggerGeocode(tenant.subdomain, token, tenant.digestId);
    } catch (e) {
      console.log(`  ❌ PATCH failed: ${e.message}`);
    }
  }

  console.log(`\n${"=".repeat(60)}\nDone.\n`);
}

main().catch(console.error);
