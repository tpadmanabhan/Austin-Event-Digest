/**
 * Unit tests for safeOutboundFetch — SSRF-safety assertions.
 *
 * Covers:
 *  - All significant private IPv4 ranges
 *  - Full fe80::/10 link-local range (fe80–febf, not just fe80)
 *  - IPv4-mapped IPv6 in both dotted-quad and hex-group form
 *  - IPv4-compatible IPv6 (::127.0.0.1)
 *  - ULA (fc/fd) ranges
 *  - Public addresses that must be allowed
 *  - safeOutboundFetch rejects private IPv4 literals without making any fetch
 *  - safeOutboundFetch rejects hostnames that DNS resolves to private IPs
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { isPrivateIp } from "./safeOutboundFetch";

// ── isPrivateIp unit tests ──────────────────────────────────────────────────

describe("isPrivateIp — private ranges blocked", () => {
  // IPv4 loopback
  it("blocks 127.0.0.1", () => expect(isPrivateIp("127.0.0.1")).toBe(true));
  it("blocks 127.255.255.255", () => expect(isPrivateIp("127.255.255.255")).toBe(true));

  // RFC-1918
  it("blocks 10.0.0.1", () => expect(isPrivateIp("10.0.0.1")).toBe(true));
  it("blocks 172.16.0.1", () => expect(isPrivateIp("172.16.0.1")).toBe(true));
  it("blocks 172.31.255.255", () => expect(isPrivateIp("172.31.255.255")).toBe(true));
  it("blocks 192.168.1.1", () => expect(isPrivateIp("192.168.1.1")).toBe(true));

  // Link-local / metadata
  it("blocks 169.254.169.254 (cloud metadata)", () => expect(isPrivateIp("169.254.169.254")).toBe(true));

  // 0.0.0.0/8
  it("blocks 0.0.0.0", () => expect(isPrivateIp("0.0.0.0")).toBe(true));

  // IPv6 loopback
  it("blocks ::1", () => expect(isPrivateIp("::1")).toBe(true));
  it("blocks ::", () => expect(isPrivateIp("::")).toBe(true));

  // fe80::/10 — standard link-local (fe80)
  it("blocks fe80::1", () => expect(isPrivateIp("fe80::1")).toBe(true));
  // fe80::/10 — upper boundary addresses (fe81–febf must also be blocked)
  it("blocks fe81::1", () => expect(isPrivateIp("fe81::1")).toBe(true));
  it("blocks fe8f::1", () => expect(isPrivateIp("fe8f::1")).toBe(true));
  it("blocks fe90::1", () => expect(isPrivateIp("fe90::1")).toBe(true));
  it("blocks fea0::1", () => expect(isPrivateIp("fea0::1")).toBe(true));
  it("blocks feb0::1", () => expect(isPrivateIp("feb0::1")).toBe(true));
  it("blocks febf::1", () => expect(isPrivateIp("febf::1")).toBe(true));

  // ULA fc00::/7
  it("blocks fc00::1", () => expect(isPrivateIp("fc00::1")).toBe(true));
  it("blocks fd00::1", () => expect(isPrivateIp("fd00::1")).toBe(true));

  // IPv4-mapped in dotted-quad form
  it("blocks ::ffff:127.0.0.1 (dotted-quad mapped loopback)", () =>
    expect(isPrivateIp("::ffff:127.0.0.1")).toBe(true));
  it("blocks ::ffff:192.168.1.1 (dotted-quad mapped RFC1918)", () =>
    expect(isPrivateIp("::ffff:192.168.1.1")).toBe(true));
  it("blocks ::ffff:10.0.0.1 (dotted-quad mapped RFC1918)", () =>
    expect(isPrivateIp("::ffff:10.0.0.1")).toBe(true));

  // IPv4-mapped in hex-group form  (::ffff:7f00:1 == ::ffff:127.0.0.1)
  it("blocks ::ffff:7f00:1 (hex-mapped loopback)", () =>
    expect(isPrivateIp("::ffff:7f00:1")).toBe(true));
  it("blocks ::ffff:c0a8:101 (hex-mapped 192.168.1.1)", () =>
    expect(isPrivateIp("::ffff:c0a8:101")).toBe(true));
  it("blocks ::ffff:a00:1 (hex-mapped 10.0.0.1)", () =>
    expect(isPrivateIp("::ffff:a00:1")).toBe(true));
  it("blocks ::ffff:ac10:1 (hex-mapped 172.16.0.1)", () =>
    expect(isPrivateIp("::ffff:ac10:1")).toBe(true));

  // IPv4-compatible (deprecated) — dotted form
  it("blocks ::127.0.0.1 (IPv4-compatible loopback, dotted)", () =>
    expect(isPrivateIp("::127.0.0.1")).toBe(true));
  // IPv4-compatible — hex-group form  (::7f00:1 == ::127.0.0.1)
  it("blocks ::7f00:1 (hex IPv4-compatible loopback)", () =>
    expect(isPrivateIp("::7f00:1")).toBe(true));
  it("blocks ::c0a8:101 (hex IPv4-compatible 192.168.1.1)", () =>
    expect(isPrivateIp("::c0a8:101")).toBe(true));
  it("blocks ::a00:1 (hex IPv4-compatible 10.0.0.1)", () =>
    expect(isPrivateIp("::a00:1")).toBe(true));
  it("blocks ::ac10:1 (hex IPv4-compatible 172.16.0.1)", () =>
    expect(isPrivateIp("::ac10:1")).toBe(true));
  // Expanded equivalent of ::7f00:1
  it("blocks 0:0:0:0:0:0:7f00:1 (expanded IPv4-compatible loopback)", () =>
    expect(isPrivateIp("0:0:0:0:0:0:7f00:1")).toBe(true));
});

describe("isPrivateIp — public addresses allowed", () => {
  it("allows 8.8.8.8", () => expect(isPrivateIp("8.8.8.8")).toBe(false));
  it("allows 1.1.1.1", () => expect(isPrivateIp("1.1.1.1")).toBe(false));
  it("allows 2606:4700:4700::1111 (Cloudflare DNS)", () =>
    expect(isPrivateIp("2606:4700:4700::1111")).toBe(false));
  // fec0::/10 was ULA in old RFCs but is now unassigned — we don't block it
  it("allows fec0::1 (unassigned, not in blocked ranges)", () =>
    expect(isPrivateIp("fec0::1")).toBe(false));
  it("allows 172.15.255.255 (just below RFC-1918 172.16)", () =>
    expect(isPrivateIp("172.15.255.255")).toBe(false));
  it("allows 172.32.0.1 (just above RFC-1918 172.31)", () =>
    expect(isPrivateIp("172.32.0.1")).toBe(false));
  it("allows 192.169.0.1 (just above 192.168)", () =>
    expect(isPrivateIp("192.169.0.1")).toBe(false));
});

// ── safeOutboundFetch pre-fetch validation ─────────────────────────────────
// These tests exercise the IP-literal and DNS-resolution validation paths that
// fire BEFORE any undici fetch call. They mock only node:dns/promises so no
// real network connections are made.

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(),
}));

import { safeOutboundFetch } from "./safeOutboundFetch";
import { lookup } from "node:dns/promises";

const mockLookup = lookup as ReturnType<typeof vi.fn>;

afterEach(() => vi.clearAllMocks());

describe("safeOutboundFetch — rejects before making any network call", () => {
  it("rejects a direct IPv4 loopback literal without calling DNS or fetch", async () => {
    await expect(safeOutboundFetch("http://127.0.0.1/")).rejects.toThrow(/private/i);
    expect(mockLookup).not.toHaveBeenCalled();
  });

  it("rejects a direct RFC-1918 IPv4 literal without calling DNS or fetch", async () => {
    await expect(safeOutboundFetch("http://192.168.1.1/")).rejects.toThrow(/private/i);
    expect(mockLookup).not.toHaveBeenCalled();
  });

  it("rejects a direct cloud-metadata IP without calling DNS or fetch", async () => {
    await expect(safeOutboundFetch("http://169.254.169.254/")).rejects.toThrow(/private/i);
    expect(mockLookup).not.toHaveBeenCalled();
  });

  it("rejects a hostname that DNS resolves to loopback", async () => {
    mockLookup.mockResolvedValue({ address: "127.0.0.1", family: 4 });
    await expect(safeOutboundFetch("https://evil.corp/")).rejects.toThrow(/Blocked/);
  });

  it("rejects a hostname that DNS resolves to RFC-1918", async () => {
    mockLookup.mockResolvedValue({ address: "10.0.0.1", family: 4 });
    await expect(safeOutboundFetch("https://internal.corp/")).rejects.toThrow(/Blocked/);
  });

  it("rejects a hostname that DNS resolves to a fe80::/10 link-local address", async () => {
    mockLookup.mockResolvedValue({ address: "fe81::1", family: 6 });
    await expect(safeOutboundFetch("https://evil.corp/")).rejects.toThrow(/Blocked/);
  });

  it("rejects non-http(s) protocol", async () => {
    await expect(safeOutboundFetch("ftp://example.com/")).rejects.toThrow(/http/i);
  });

  it("rejects an invalid URL", async () => {
    await expect(safeOutboundFetch("not-a-url")).rejects.toThrow(/Invalid URL/);
  });
});
