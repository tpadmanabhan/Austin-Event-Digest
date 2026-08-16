/**
 * SSRF-safe outbound HTTP fetcher.
 *
 * Validates the initial URL and every redirect target by resolving the hostname
 * via DNS and rejecting any address that falls in a private, loopback, or
 * link-local range (IPv4 and IPv6).
 *
 * DNS-rebinding protection: the TCP connection is pinned to the pre-validated
 * IP address via an undici Agent whose `lookup` callback returns the already-
 * resolved, already-validated address instead of calling the system resolver.
 * This closes the TOCTOU window between the security check and connect().
 *
 * Agent lifecycle: a fresh Agent is created per redirect hop and scheduled for
 * graceful closure immediately after response headers arrive. Agent.close() is
 * non-blocking and does not abort the in-flight response-body stream.
 */

import { lookup } from "node:dns/promises";
import { Agent, fetch as undiciFetch } from "undici";
import type { LookupFunction } from "node:net";

// ---------------------------------------------------------------------------
// IPv6 canonicalisation
// ---------------------------------------------------------------------------

/**
 * Expand an IPv6 address (which may use `::` shorthand) into exactly 8
 * lowercase hex groups.  Returns null for malformed input.
 *
 * Handles plain IPv6 (`2001:db8::1`), compressed (`::1`, `::`, `fe80::1`),
 * and bracketed literals (`[::1]`).
 */
function expandIPv6(raw: string): string[] | null {
  const addr = raw.toLowerCase().replace(/^\[|\]$/g, "");
  const parts = addr.split("::");
  if (parts.length > 2) return null; // more than one "::" — invalid

  if (parts.length === 2) {
    const left  = parts[0] ? parts[0].split(":") : [];
    const right = parts[1] ? parts[1].split(":") : [];
    const fill  = 8 - left.length - right.length;
    if (fill < 0) return null;
    return [...left, ...Array<string>(fill).fill("0"), ...right];
  }

  const groups = addr.split(":");
  return groups.length === 8 ? groups : null;
}

/**
 * Given two hex IPv6 groups (the last two of a v4-mapped or v4-compatible
 * address), return the equivalent dotted-quad IPv4 string.
 */
function hexGroupsToDotted(g6: string, g7: string): string {
  const hi = parseInt(g6, 16);
  const lo = parseInt(g7, 16);
  return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
}

// ---------------------------------------------------------------------------
// Private-range detection
// ---------------------------------------------------------------------------

export function isPrivateIp(ip: string): boolean {
  const raw = ip.toLowerCase().replace(/^\[|\]$/g, "");

  // ── Try IPv6 canonicalisation first ─────────────────────────────────────
  const groups = expandIPv6(raw);
  if (groups !== null) {
    // Loopback  ::1
    if (groups.every((g, i) => i < 7 ? g === "0" : parseInt(g, 16) === 1)) return true;
    // All-zeros ::
    if (groups.every((g) => parseInt(g, 16) === 0)) return true;

    // fe80::/10 — link-local.  The /10 mask means bits 0–9 are 1111 1110 10,
    // i.e. the first 16-bit group must be in the range fe80–febf.
    const g0 = parseInt(groups[0], 16);
    if (g0 >= 0xfe80 && g0 <= 0xfebf) return true;

    // fc00::/7 — unique-local (ULA): fe00 >> 1 = fc00, covers fc00–fdff
    if (g0 >= 0xfc00 && g0 <= 0xfdff) return true;

    // IPv4-mapped  ::ffff:w.x.y.z  (groups 0–4 zero, group 5 = ffff)
    const allZeroFirst5 = groups.slice(0, 5).every((g) => parseInt(g, 16) === 0);
    if (allZeroFirst5 && parseInt(groups[5], 16) === 0xffff) {
      return isPrivateIp(hexGroupsToDotted(groups[6], groups[7]));
    }

    // IPv4-compatible  ::w.x.y.z  (groups 0–5 all zero)  [deprecated RFC 4291]
    const allZeroFirst6 = groups.slice(0, 6).every((g) => parseInt(g, 16) === 0);
    if (allZeroFirst6) {
      const g6 = parseInt(groups[6], 16);
      const g7 = parseInt(groups[7], 16);
      // Skip pure loopback (::1) and all-zeros (::) already handled above
      if (g6 !== 0 || g7 !== 0) {
        return isPrivateIp(hexGroupsToDotted(groups[6], groups[7]));
      }
    }

    // Treat any remaining valid IPv6 as public (link-local already caught)
    return false;
  }

  // ── Pure IPv4 dotted-quad ─────────────────────────────────────────────────
  const parts = raw.split(".").map(Number);
  if (parts.length === 4 && parts.every((n) => !isNaN(n) && n >= 0 && n <= 255)) {
    const [a, b, c] = parts;
    if (a === 0) return true;                           // 0.0.0.0/8
    if (a === 10) return true;                          // 10.0.0.0/8
    if (a === 100 && b >= 64 && b <= 127) return true;  // 100.64.0.0/10 shared address
    if (a === 127) return true;                         // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return true;            // 169.254.0.0/16 link-local / metadata
    if (a === 172 && b >= 16 && b <= 31) return true;  // 172.16.0.0/12
    if (a === 192 && b === 168) return true;            // 192.168.0.0/16
    if (a === 192 && b === 0 && c === 2) return true;   // 192.0.2.0/24 documentation
    if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmarking
    if (a === 198 && b === 51 && c === 100) return true;  // 198.51.100.0/24 documentation
    if (a === 203 && b === 0 && c === 113) return true;   // 203.0.113.0/24 documentation
    if (a === 240) return true;                         // 240.0.0.0/4 reserved
    if (a === 255) return true;                         // broadcast
  }

  return false;
}

// ---------------------------------------------------------------------------
// URL validation + DNS resolution
// ---------------------------------------------------------------------------

async function resolveAndValidate(
  urlStr: string
): Promise<{ url: URL; resolvedAddress: string; family: 4 | 6 }> {
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
    return { url: parsed, resolvedAddress: hostname, family: 4 };
  }

  // IPv6 literal (may be bracketed in the URL — hostname strips brackets)
  if (expandIPv6(hostname) !== null) {
    if (isPrivateIp(hostname)) throw new Error(`Blocked: ${hostname} is a private address`);
    return { url: parsed, resolvedAddress: hostname, family: 6 };
  }

  // Hostname — resolve via DNS and check the result
  try {
    const result = await lookup(hostname, { verbatim: false });
    if (isPrivateIp(result.address)) {
      throw new Error(`Blocked: ${hostname} resolves to private address ${result.address}`);
    }
    return { url: parsed, resolvedAddress: result.address, family: result.family as 4 | 6 };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith("Blocked:")) throw err;
    throw new Error(`Cannot resolve hostname: ${hostname}`);
  }
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
 * Fetch a public URL safely, pinning the TCP connection to the pre-validated
 * IP address so a DNS-rebinding attacker cannot swap in a private address
 * between the security check and the actual connect() call.
 *
 * A fresh undici Agent is created per hop and scheduled for graceful closure
 * immediately after the response headers arrive (without blocking or aborting
 * the response body stream the caller will consume).
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
    const { resolvedAddress, family } = await resolveAndValidate(currentUrl);

    // Per-hop Agent whose lookup always returns the already-validated IP.
    const pinnedLookup: LookupFunction = (_host, _opts, cb) => {
      (cb as (err: NodeJS.ErrnoException | null, address: string, family: number) => void)(
        null, resolvedAddress, family
      );
    };

    const agent = new Agent({ connect: { lookup: pinnedLookup } });

    const res = await undiciFetch(currentUrl, {
      dispatcher: agent,
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: BROWSER_HEADERS,
    });

    // Schedule graceful pool shutdown without awaiting — the in-flight
    // response-body stream (managed by the connection, not the pool) remains
    // readable after close() because undici only drains idle connections.
    void agent.close();

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error("Redirect missing Location header");
      currentUrl = new URL(location, currentUrl).href;
      continue;
    }

    return res as unknown as Response;
  }

  throw new Error("Too many redirects");
}
