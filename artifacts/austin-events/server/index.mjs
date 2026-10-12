import http from "node:http";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolveSite, loadPublicModel, sitemap, publicApi, PLATFORM_ORIGIN } from "./public-model.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const production = process.env.NODE_ENV === "production";
const vite = production ? null : await (await import("vite")).createServer({
  root, configFile: path.join(root, "vite.config.ts"),
  server: { middlewareMode: true }, appType: "custom",
});
const renderer = production ? await import("../dist/server/entry-server.js") : null;
const escape = text => String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const json = value => JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
const mime = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".woff2": "font/woff2", ".ico": "image/x-icon", ".html": "text/html" };

function send(res, status, type, body, headers = {}) {
  res.writeHead(status, { "Content-Type": `${type}; charset=utf-8`, "X-Content-Type-Options": "nosniff", ...headers });
  res.end(body);
}

async function publicApiForTenant(site) {
  const listing = await publicApi(site, "/tenants/list");
  return listing?.tenants?.some(tenant => tenant.slug === site.slug);
}

http.createServer(async (req, res) => {
  try {
    const requested = new URL(req.url, "http://public.invalid");
    const pathname = requested.pathname;
    if (pathname === "/healthz") return send(res, 200, "text/plain", "ok");
    if (pathname === "/index.html") return send(res, 301, "text/plain", "Moved", { Location: "/" });
    // Assets/Vite requests are handled separately from public document requests.
    if (pathname.startsWith("/assets/") || pathname.includes(".") && !["/robots.txt", "/sitemap.xml", "/sitemap-pages.xml"].includes(pathname) ||
        pathname.startsWith("/@") || pathname.startsWith("/src/") || pathname.startsWith("/node_modules/")) {
      if (vite) return vite.middlewares(req, res, () => send(res, 404, "text/plain", "Not found"));
      const asset = path.resolve(root, "dist/public", "." + decodeURIComponent(pathname));
      const publicRoot = path.resolve(root, "dist/public");
      if (!asset.startsWith(publicRoot + path.sep)) return send(res, 404, "text/plain", "Not found");
      try { return send(res, 200, mime[path.extname(asset)] || "application/octet-stream", await fs.readFile(asset), { "Cache-Control": pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "public, max-age=300" }); }
      catch { return send(res, 404, "text/plain", "Not found"); }
    }
    const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
    const site = resolveSite(host, !production);
    if (!site) return send(res, 404, "text/plain", "Unknown site", { "X-Robots-Tag": "noindex" });
    if (host.split(":")[0] === "www.eventcarpooling.com") return send(res, 301, "text/plain", "Moved", { Location: PLATFORM_ORIGIN + req.url });
    if (!site.slug && (/^\/digest\/\d+$/.test(pathname) || pathname === "/rsvp")) {
      return send(res, 302, "text/plain", "Moved", { Location: "https://austin.eventcarpooling.com" + req.url, "X-Robots-Tag": pathname === "/rsvp" ? "noindex" : "all" });
    }
    if (pathname.length > 1 && pathname.endsWith("/")) return send(res, 301, "text/plain", "Moved", { Location: req.url.replace(/\/(?=\?|$)/, "") });
    if (pathname === "/robots.txt") {
      const model = await loadPublicModel(site, "/");
      if (model.noindex) return send(res, 404, "text/plain", "Unknown site");
      return send(res, 200, "text/plain", `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /rsvp\nDisallow: /preferences\nDisallow: /unsubscribe\nSitemap: https://${site.host}/sitemap.xml\n`);
    }
    if (pathname === "/sitemap-pages.xml" && !site.slug) {
      return send(res, 200, "application/xml", `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${PLATFORM_ORIGIN}/</loc></url><url><loc>${PLATFORM_ORIGIN}/about</loc></url></urlset>`);
    }
    if (pathname === "/sitemap.xml") {
      const xml = await sitemap(site);
      return send(res, xml ? 200 : 404, xml ? "application/xml" : "text/plain", xml || "Unknown site");
    }
    const privateRoute = /^\/(?:admin|rsvp|preferences|unsubscribe)(?:\/|$)/.test(pathname);
    if (privateRoute && (!site.slug || !(await publicApiForTenant(site)))) {
      return send(res, 404, "text/plain", "Unknown site or private route", { "X-Robots-Tag": "noindex" });
    }
    const model = privateRoute
      ? { kind: "private", title: "Private action | EventCarpooling", description: "Subscriber and administrative actions.", canonical: `https://${site.host}${pathname}`, homeUrl: "/", events: [], cities: [], noindex: true }
      : await loadPublicModel(site, pathname);
    if ([...requested.searchParams.keys()].some(key => /^(?:email|token|sig|signature|subscriber|subscriberId|hmac)$/i.test(key))) model.noindex = true;
    let template = await fs.readFile(path.join(root, production ? "dist/public/index.html" : "index.html"), "utf8");
    if (vite) template = await vite.transformIndexHtml(req.url, template);
    const module = renderer || await vite.ssrLoadModule("/server/entry-server.tsx");
    Object.assign(model, module.enrichModel(model));
    const head = `<title>${escape(model.title)}</title><meta name="description" content="${escape(model.description)}"><link rel="canonical" href="${escape(model.canonical)}"><meta property="og:title" content="${escape(model.title)}"><meta property="og:description" content="${escape(model.description)}"><meta property="og:url" content="${escape(model.canonical)}"><meta property="og:type" content="website"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escape(model.title)}"><meta name="twitter:description" content="${escape(model.description)}">${model.noindex ? '<meta name="robots" content="noindex,nofollow">' : ""}${model.schema ? `<script type="application/ld+json">${json(model.schema)}</script>` : ""}`;
    template = template.replace(/<title>[\s\S]*?<\/title>/i, "").replace(/<meta\b[^>]*(?:name=["'](?:description|twitter:[^"']*)["']|property=["']og:[^"']*["'])[^>]*>/gi, "");
    const body = privateRoute ? "" : module.render(model);
    // Share crawlers read this initial HTML without running client metadata effects.
    const imagePath = site.slug === "sanfrancisco" ? "/images/sanfrancisco-hero.jpg" : "/opengraph.jpg";
    const image = model.event?.imageUrl || `https://${site.host}${imagePath}`;
    const extras = `<meta property="og:image" content="${escape(image)}"><meta name="twitter:image" content="${escape(image)}">${vite ? '<link rel="stylesheet" href="/src/index.css?direct">' : ""}`;
    template = template.replace("</head>", head + extras + "</head>").replace('<div id="root"></div>', `<div id="root">${body}</div><script id="public-document" type="application/json">${json(model)}</script>`);
    const status = model.kind === "not-found" ? 404 : 200;
    send(res, status, "text/html", template, model.noindex ? { "X-Robots-Tag": "noindex,nofollow", "Cache-Control": "no-store" } : { "Cache-Control": "public, max-age=0, must-revalidate" });
  } catch (error) {
    // Log only the error classification, never signed query strings or credentials.
    console.error("Public document request failed", { code: error?.code || error?.name || "unknown" });
    // No stale fake edition or empty success response on a backend failure.
    send(res, 503, "text/html", '<!doctype html><html lang="en"><head><title>Temporarily unavailable | EventCarpooling</title><meta name="robots" content="noindex"></head><body><h1>Temporarily unavailable</h1><p>Event information could not be loaded. Please try again shortly.</p></body></html>', { "Retry-After": "30", "Cache-Control": "no-store" });
  }
}).listen(Number(process.env.PORT || 3000), "0.0.0.0");
