/**
 * SSRF-safe outbound HTTP fetcher.
 *
 * Validates the initial URL and every redirect target by resolving the hostname
 * via DNS and rejecting any address that falls in a private, loopback, or
 * link-local range (IPv4 and IPv6). Redirects are followed manually so each
 * hop is validated before the next request is made.
 */

import { lookup } from "node:dns/promises";

// ---------------------------------------------------------------------------
// Private-range detection
// ---------------------------------------------------------------------------

function isPrivateIp(ip: string): boolean {
  const raw = ip.toLowerCase().replace(/^\[|\]$/g, "");

  // IPv6 loopback / link-local / unique-local
  if (raw === "::1" || raw === "::" || raw === "0:0:0:0:0:0:0:1") return true;
  if (raw.startsWith("fe80:")) return true;          // link-local
  if (raw.startsWith("fc") || raw.startsWith("fd")) return true; // unique-local (ULA)

  // IPv4-mapped IPv6 (::ffff:a.b.c.d or ::ffff:0102:0304)
  const mapped = raw.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
  const ipv4 = mapped ? mapped[1] : raw;

  const parts = ipv4.split(".").map(Number);
  if (parts.length === 4 && parts.every((n) => !isNaN(n) && n >= 0 && n <= 255)) {
    const [a, b] = parts;
    if (a === 0) return true;                           // 0.0.0.0/8
    if (a === 10) return true;                          // 10.0.0.0/8
    if (a === 100 && b >= 64 && b <= 127) return true;  // 100.64.0.0/10 shared address
    if (a === 127) return true;                         // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return true;            // 169.254.0.0/16 link-local / metadata
    if (a === 172 && b >= 16 && b <= 31) return true;  // 172.16.0.0/12
    if (a === 192 && b === 168) return true;            // 192.168.0.0/16
    if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmarking
    if (a === 203 && b === 0 && parts[2] === 113) return true; // 203.0.113.0/24 documentation
    if (a === 240) return true;                         // 240.0.0.0/4 reserved
    if (a === 255) return true;                         // broadcast
  }

  return false;
}

async function assertPublicUrl(urlStr: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new Error("Invalid URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("URL must use http or https");
  }

  const hostname = parsed.hostname.toLowerCase();

  // Numeric IPv4 literal — no DNS needed
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    if (isPrivateIp(hostname)) throw new Error(`Blocked: ${hostname} is a private address`);
    return parsed;
  }

  // IPv6 literal
  const ipv6Bare = hostname.replace(/^\[|\]$/g, "");
  if (ipv6Bare.includes(":")) {
    if (isPrivateIp(ipv6Bare)) throw new Error(`Blocked: ${hostname} is a private address`);
    return parsed;
  }

  // Hostname — resolve via DNS and check the result
  try {
    const { address } = await lookup(hostname, { verbatim: false });
    if (isPrivateIp(address)) {
      throw new Error(`Blocked: ${hostname} resolves to private address ${address}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith("Blocked:")) throw err;
    // DNS resolution failure — treat as unsafe rather than silently allowing
    throw new Error(`Cannot resolve hostname: ${hostname}`);
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
};

/**
 * Fetch a public URL safely, validating every redirect hop against private
 * IP ranges before making the next request.
 *
 * @throws if the URL or any redirect target is invalid, non-HTTP(S), or
 *         resolves to a private / loopback address.
 */
export async function safeOutboundFetch(
  urlStr: string,
  { timeoutMs = 12000, maxRedirects = 5 }: { timeoutMs?: number; maxRedirects?: number } = {}
): Promise<Response> {
  let currentUrl = urlStr;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicUrl(currentUrl);

    const res = await fetch(currentUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: BROWSER_HEADERS,
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error("Redirect missing Location header");
      // Resolve relative Location values against the current URL
      currentUrl = new URL(location, currentUrl).href;
      continue;
    }

    return res;
  }

  throw new Error("Too many redirects");
}
