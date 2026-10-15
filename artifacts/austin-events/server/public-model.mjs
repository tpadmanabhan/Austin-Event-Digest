import { createHash } from "node:crypto";
import http from "node:http";
import https from "node:https";

export const PLATFORM_ORIGIN = "https://eventcarpooling.com";
const hash = value => createHash("sha256").update(value).digest("hex").slice(0, 24);
export const slugify = text => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90) || "event";
export const venueIdentity = (city, venue) => `vn-${hash(`${city}\n${venue.trim().toLowerCase()}`)}`;
export const safeUrl = value => {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : undefined; }
  catch { return undefined; }
};

export function resolveSite(hostname, development = false) {
  const host = hostname.toLowerCase().split(":")[0];
  if (host === "eventcarpooling.com" || host === "www.eventcarpooling.com") return { slug: null, host: "eventcarpooling.com" };
  if (host.endsWith(".eventcarpooling.com")) {
    const slug = host.slice(0, -".eventcarpooling.com".length);
    if (/^[a-z0-9-]+$/.test(slug)) return { slug, host };
    return null;
  }
  if (development && (host === "localhost" || host === "127.0.0.1" || host.endsWith(".replit.dev") || host.endsWith(".repl.co"))) {
    const slug = process.env.VITE_TENANT_SLUG || "austin";
    return { slug, host: `${slug}.eventcarpooling.com` };
  }
  // The publishing service's alternate root host serves the platform, not a city.
  if (host.endsWith(".replit.app")) return { slug: null, host: "eventcarpooling.com" };
  return null;
}

export function publicApiOrigin(environment = process.env) {
  return environment.INTERNAL_API_ORIGIN ||
    (environment.NODE_ENV === "production" ? PLATFORM_ORIGIN : "http://127.0.0.1:80");
}

export async function publicApi(site, pathname) {
  // Port 80 is the workspace proxy, not the published application's router.
  // Published API requests use the platform's HTTPS edge, retaining the city Host.
  const origin = publicApiOrigin();
  // Native transport preserves Host through the shared proxy. Node fetch may
  // silently replace Host, which would lose the city before reaching the API.
  return new Promise((resolve, reject) => {
    const url = new URL(`/api${pathname}`, origin);
    const transport = url.protocol === "https:" ? https : http;
    const request = transport.get(url, { headers: { "X-Forwarded-Host": site.host, Host: site.host } }, response => {
      const chunks = []; let size = 0;
      response.on("data", chunk => {
        size += chunk.length;
        if (size > 8 * 1024 * 1024) response.destroy(new Error("Public response too large"));
        else chunks.push(chunk);
      });
      response.on("error", reject);
      response.on("end", () => {
        if (response.statusCode === 404) return resolve(null);
        if (response.statusCode < 200 || response.statusCode >= 300) return reject(new Error(`Public data unavailable (${response.statusCode})`));
        try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch (error) { reject(error); }
      });
    });
    request.setTimeout(10000, () => request.destroy(new Error("Public API timeout")));
    request.on("error", reject);
  });
}

function publicEvent(event, citySlug) {
  const id = event.eventId;
  if (!/^ev-[a-f0-9]{24}$/.test(id || "")) throw new Error("Public event identity missing");
  const venueId = event.venue?.trim() ? /^vn-[a-f0-9]{24}$/.test(event.venueId || "") ? event.venueId : venueIdentity(citySlug, event.venue) : undefined;
  return {
    ...event, id, venueId, link: safeUrl(event.link), imageUrl: safeUrl(event.imageUrl),
    url: citySlug === "austincares" || event.isPost || event.isBusinessSpotlight ? undefined : `/events/${id}/${slugify(event.title)}`,
    venueUrl: citySlug !== "austincares" && venueId ? `/venues/${venueId}/${slugify(event.venue)}` : undefined,
  };
}

export function validIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value || "")) return false;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  return calendar.getUTCFullYear() === year && calendar.getUTCMonth() === month - 1 && calendar.getUTCDate() === day && Number.isFinite(Date.parse(value));
}

export function eventSchema(event, origin) {
  // Only source-provided, explicit ISO dates qualify. Display strings remain visible,
  // but we never convert "Saturday", a missing year, or a guessed noon into schema.
  const startDate = event.startDate || (validIsoDate(event.date) ? event.date : undefined);
  if (event.isPost || event.isBusinessSpotlight || !validIsoDate(startDate) || !event.venue?.trim()) return undefined;
  return {
    "@context": "https://schema.org", "@type": "Event", name: event.title,
    startDate,
    ...(validIsoDate(event.endDate) && Date.parse(event.endDate) >= Date.parse(startDate) ? { endDate: event.endDate } : {}),
    description: event.description, url: new URL(event.url, origin).href,
    ...(event.imageUrl ? { image: [event.imageUrl] } : {}),
    location: { "@type": "Place", name: event.venue,
      ...(event.venueAddress ? { address: { "@type": "PostalAddress", streetAddress: event.venueAddress } } : {}) },
  };
}

const PLATFORM_CITY_ORDER = ["boston", "atlanta", "sanfrancisco", "austin", "sacramento", "miami", "houston", "tokyo", "stlouis", "portland", "bulverde", "dc", "austincares", "brushycreek"];
const NEW_CITY_SLUGS = new Set(["atlanta", "sanfrancisco", "austin", "sacramento", "miami", "boston"]);
const CITY_ETHICS_RESOURCES = {
  boston: { url: "https://www.boston.gov/government/cabinets/innovation-and-technology/city-boston-generative-artificial-intelligence-gen-ai", title: "Boston’s generative AI policy" },
  sanfrancisco: { url: "https://hai.stanford.edu/ai-index/2026-ai-index-report", title: "Stanford HAI AI Index 2026" },
  austin: { url: "https://customersuccessforgood.com/2026/10/07/ai-doesnt-solve-this/", title: "AI Doesn’t Solve This" },
  sacramento: { url: "https://www.nist.gov/itl/ai-risk-management-framework", title: "NIST AI Risk Management Framework" },
  miami: { url: "https://algorithmsofoppression.com/about/", title: "Algorithms of Oppression" },
};

export async function loadPublicModel(site, pathname) {
  const origin = `https://${site.host}`;
  const listing = await publicApi(site, "/tenants/list");
  const tenants = listing?.tenants || [];
  const tenant = site.slug ? tenants.find(t => t.slug === site.slug) : null;
  const base = {
    kind: "not-found", title: "Page not found | EventCarpooling", description: "This public page could not be found.",
    canonical: origin + pathname, homeUrl: "/", events: [],
    cities: tenants.map(t => {
      const url = `https://${t.slug}.eventcarpooling.com/`;
      const ethics = CITY_ETHICS_RESOURCES[t.slug];
      return {
        slug: t.slug, name: t.name || t.city, url, isNew: NEW_CITY_SLUGS.has(t.slug),
        ethicsUrl: ethics?.url || url,
        ethicsTitle: ethics?.title || `Explore the ${t.city || t.name} edition for local updates`,
      };
    }).sort((a, b) => {
      const rank = slug => {
        const index = PLATFORM_CITY_ORDER.indexOf(slug);
        return index < 0 ? PLATFORM_CITY_ORDER.length : index;
      };
      return rank(a.slug) - rank(b.slug);
    }),
    noindex: true,
  };
  if (site.slug && !tenant) return base;
  const about = pathname === "/about";
  if (!site.slug) {
    if (pathname !== "/" && !about) return base;
    return { ...base, kind: about ? "about" : "platform", noindex: false,
      title: about ? "About EventCarpooling" : "Event Newsletter in an Hour | EventCarpooling",
      description: "Explore local city newsletters, recently updated editions, AustinCares deals, and city-specific AI Ethics reading from EventCarpooling.",
      intro: "Event Newsletter in an Hour.",
      schema: { "@context": "https://schema.org", "@type": "WebSite", name: "EventCarpooling", url: PLATFORM_ORIGIN } };
  }
  const cityName = tenant.city || tenant.name;
  Object.assign(base, { cityName, citySlug: site.slug, siteName: tenant.name });
  if (about) return { ...base, kind: "about", noindex: false, title: `About ${tenant.name} | EventCarpooling`,
    description: `Learn how ${tenant.name} brings together local events, newsletters, maps, and community participation.` };
  const digestMatch = pathname.match(/^\/digest\/(\d+)$/);
  if (pathname !== "/" && pathname !== "/full" && !digestMatch && !pathname.startsWith("/events/") && !pathname.startsWith("/venues/")) return base;
  if (pathname === "/full" && site.slug !== "austincares") return base;
  const collection = await publicApi(site, "/events/digest/list");
  const digests = collection?.digests || [];
  let digest = digests[0];
  if (digestMatch) {
    // Tenant-scoped API never returns another city's digest.
    digest = digests.find(d => String(d.id) === digestMatch[1]);
    if (!digest) return base;
  }
  const events = (digest?.events || []).map(e => publicEvent(e, site.slug));
  const catalog = [...new Map(digests.flatMap(d => d.events || []).reverse().map(e => {
    const event = publicEvent(e, site.slug); return [event.id, event];
  })).values()].filter(e => !e.isPost && !e.isBusinessSpotlight);
  const cityModel = { ...base, kind: digestMatch ? "digest" : site.slug === "austincares" ? "deals" : "city",
    noindex: false, title: site.slug === "austincares" ? "AustinCares — Local Deals & Free Services" : digestMatch && digest ? digest.subject : `${tenant.name} | Local Events & Community`,
    description: site.slug === "austincares" ? "Explore Austin-area curated offers, community-submitted deals, free services, and map-based local discovery." :
      `Explore curated ${cityName} events, local newsletters, venues, and community activities. Learn about attendance and carpool-interest options where available.`,
    intro: digest?.intro || `Explore local activities in ${cityName}. Subscribe on this city's homepage for new editions.`,
    weekOf: digest?.weekOf, digestId: digest?.id, events,
    editionUrl: digest ? `/digest/${digest.id}` : undefined,
  };
  if (cityModel.kind === "deals") {
    const submitted = await publicApi(site, "/deals/submitted");
    cityModel.events.push(...(submitted?.deals || []).map(deal => ({
      id: `community-offer-${deal.id}`, title: deal.business, description: deal.deal,
      date: deal.day || "Recurring offer", venue: deal.locationName || deal.business,
      venueAddress: deal.locationAddress, category: "Community offer", isPost: true,
    })));
  }
  if (pathname.startsWith("/events/")) {
    if (site.slug === "austincares") return base;
    const match = pathname.match(/^\/events\/(ev-[a-f0-9]{24})(?:\/[^/]+)?$/);
    const event = match && catalog.find(e => e.id === match[1]);
    if (!event) return base;
    if (!validIsoDate(event.startDate) && !validIsoDate(event.date) && event.link?.includes("ticketmaster.com/")) {
      const verified = await publicApi(site, `/events/public/${event.id}/metadata`);
      Object.assign(event, verified?.metadata || {});
    }
    return { ...cityModel, kind: "event", event, events: [event],
      canonical: origin + event.url, title: `${event.title} in ${cityName} | EventCarpooling`,
      description: `Explore ${event.title} in ${cityName}: event details, venue, official registration, and how to express interest in attending or carpooling.`,
      schema: eventSchema(event, origin) };
  }
  if (pathname.startsWith("/venues/")) {
    if (site.slug === "austincares") return base;
    const match = pathname.match(/^\/venues\/(vn-[a-f0-9]{24})(?:\/[^/]+)?$/);
    const related = match ? catalog.filter(e => e.venueId === match[1]) : [];
    if (!related.length) return base;
    return { ...cityModel, kind: "venue", venueName: related[0].venue, events: related,
      canonical: origin + related[0].venueUrl, title: `${related[0].venue} Events | ${cityName}`,
      description: `Discover listed events at ${related[0].venue} in ${cityName}. Find official event sources and information about community attendance.` };
  }
  return cityModel;
}

export async function sitemap(site) {
  const origin = `https://${site.host}`;
  const model = await loadPublicModel(site, "/");
  if (model.noindex) return null;
  const escape = text => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
  if (!site.slug) return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${PLATFORM_ORIGIN}/sitemap-pages.xml</loc></sitemap>${model.cities.map(c => `<sitemap><loc>${escape(c.url)}sitemap.xml</loc></sitemap>`).join("")}</sitemapindex>`;
  const collection = await publicApi(site, "/events/digest/list");
  const urls = new Set([origin + "/", origin + "/about"]);
  if (site.slug === "austincares") urls.add(origin + "/full");
  for (const digest of collection?.digests || []) {
    urls.add(`${origin}/digest/${digest.id}`);
    if (site.slug !== "austincares") for (const raw of digest.events || []) {
      const e = publicEvent(raw, site.slug);
      if (e.url) urls.add(origin + e.url);
      if (e.url && e.venueUrl) urls.add(origin + e.venueUrl);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...urls].map(url => `<url><loc>${escape(url)}</loc></url>`).join("")}</urlset>`;
}
