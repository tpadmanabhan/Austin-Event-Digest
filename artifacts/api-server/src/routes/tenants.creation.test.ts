import express from "express";
import { request as httpRequest, type Server } from "node:http";
import { createHmac } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// No live database, credentials, or email providers are used by this suite.
const mocks = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn(),
  sendEmail: vi.fn(),
}));
vi.mock("@workspace/db", () => ({
  db: mocks,
  tenantsTable: Object.fromEntries([
    "id", "slug", "name", "city", "isActive", "passwordHash", "adminEmail",
    "emailVerified", "accentColor", "categories", "digestTitle", "curatorName",
    "firstRun", "heroImageUrl", "brandIconUrl", "createdAt",
  ].map(key => [key, key])),
  cityRequestsTable: {},
}));
vi.mock("drizzle-orm", async (importOriginal) => ({
  ...await importOriginal<typeof import("drizzle-orm")>(),
  eq: (column: string, value: unknown) => ({ column, value }),
  and: (...conditions: unknown[]) => ({ conditions }),
}));
vi.mock("../lib/emailService", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("../lib/logger", () => ({ logger: { error: vi.fn() } }));

import tenantsRouter from "./tenants";
import { createCityRequestsRouter } from "./cityRequests";
import { requireTenant, resolveTenant } from "../middleware/resolveTenant";
import { adminTokenForEmail, adminTokenForHash, requireAdmin } from "../middleware/requireAdmin";

type Predicate = { column: string; value: unknown } | { conditions: Predicate[] };
function matches(row: Record<string, unknown>, predicate?: Predicate): boolean {
  if (!predicate) return true;
  return "conditions" in predicate
    ? predicate.conditions.every(condition => matches(row, condition))
    : row[predicate.column] === predicate.value;
}

const existingCity = {
  id: 1, slug: "austin", city: "Austin", name: "Existing Austin",
  isActive: true, emailVerified: true, passwordHash: "synthetic-existing-password-hash",
  adminEmail: "existing@example.invalid", categories: ["Tech"], accentColor: "#123456",
  firstRun: false, heroImageUrl: null, brandIconUrl: null,
};
const legacyPayload = {
  cityName: "Unreviewed City", slug: "unreviewed", adminEmail: "requester@example.invalid",
  adminPassword: "synthetic-attacker-password", categories: ["Tech"],
};

describe("retired public city creation", () => {
  let server: Server;
  let origin: string;
  const submit = vi.fn();

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      Object.assign(req, { log: { error: vi.fn(), info: vi.fn() } });
      next();
    });
    // Exercise real host resolution and route guards, not a fake tenant flag.
    app.use(resolveTenant);
    app.use("/api", tenantsRouter, createCityRequestsRouter(submit));
    app.get("/api/test-admin", requireTenant, requireAdmin, (_req, res) => {
      res.json({ authenticated: true });
    });
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>(resolve => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test port missing");
    origin = `http://127.0.0.1:${address.port}`;
  });
  afterAll(() => new Promise<void>(resolve => server.close(() => resolve())));
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RSVP_HMAC_SECRET", "synthetic-test-secret-only");
    mocks.rows = [structuredClone(existingCity), {
      ...existingCity, id: 2, slug: "managed", passwordHash: null,
      adminEmail: "managed@example.invalid",
    }, {
      ...existingCity, id: 3, slug: "pending", isActive: false, emailVerified: false,
    }];
    mocks.select.mockImplementation((fields?: Record<string, string>) => {
      let predicate: Predicate | undefined;
      const result = () => mocks.rows.filter(row => matches(row, predicate)).map(row =>
        fields ? Object.fromEntries(Object.entries(fields).map(([key, column]) => [key, row[column]])) : { ...row });
      const query = {
        from: () => query,
        where: (value: Predicate) => { predicate = value; return query; },
        limit: async (count: number) => result().slice(0, count),
        orderBy: async () => result(),
      };
      return query;
    });
    for (const write of [mocks.insert, mocks.update, mocks.execute, mocks.transaction, mocks.sendEmail]) {
      write.mockReset().mockImplementation(() => { throw new Error("Unexpected write or email"); });
    }
    submit.mockReset().mockResolvedValue({
      saved: true, duplicate: false, notificationStatus: "sent", acknowledgementStatus: "sent",
    });
  });
  afterEach(() => {
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.execute).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  function request(path: string, options: {
    host?: string; body?: unknown; headers?: Record<string, string>;
  } = {}): Promise<Response> {
    // Native transport preserves the test Host. Node fetch may replace it with
    // localhost, silently testing DEFAULT_TENANT_SLUG rather than public routing.
    return new Promise((resolve, reject) => {
      const req = httpRequest(origin + "/api" + path, {
        method: options.body === undefined ? "GET" : "POST",
        headers: {
          Host: options.host ?? "eventcarpooling.com",
          "Content-Type": "application/json",
          ...options.headers,
        },
      }, res => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("error", reject);
        res.on("end", () => {
          const headers = new Headers();
          for (const [name, value] of Object.entries(res.headers)) {
            if (Array.isArray(value)) value.forEach(item => headers.append(name, item));
            else if (value !== undefined) headers.set(name, value);
          }
          resolve(new Response(Buffer.concat(chunks), { status: res.statusCode, headers }));
        });
      });
      req.on("error", reject);
      req.end(options.body === undefined ? undefined : JSON.stringify(options.body));
    });
  }

  it.each([legacyPayload, {}, { ...legacyPayload, slug: "austin" }, {
    ...legacyPayload, slug: ["unexpected-type"],
  }])("rejects legacy payloads without reading or writing tenant data: %j", async (body) => {
    const snapshot = structuredClone(mocks.rows);
    const response = await request("/tenants", { body });
    expect(response.status).toBe(410);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await response.json()).toEqual({
      error: "city_creation_disabled",
      message: expect.stringContaining("/api/city-requests"),
    });
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
    expect(mocks.rows).toEqual(snapshot);
  });

  it.each([
    { host: "www.eventcarpooling.com", status: 410 },
    { host: "unrecognized.invalid", status: 410 },
    { host: "austin.eventcarpooling.com", status: 403 },
    { host: "unreviewed.eventcarpooling.com", status: 404 },
    { host: "eventcarpooling.com", status: 410, headers: {
      "x-tenant-slug": "austin", Authorization: "Bearer synthetic-forged-admin-token",
    } },
  ])("cannot bypass retirement through host or credential changes: $host", async ({ host, status, headers }) => {
    const response = await request("/tenants", { host, body: legacyPayload, headers });
    expect(response.status).toBe(status);
    const text = await response.text();
    expect(text).not.toMatch(/adminUrl|passwordHash|"token"|requiresVerification/);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("stays disabled when email verification is not configured", async () => {
    vi.stubEnv("RSVP_HMAC_SECRET", "");
    expect((await request("/tenants", { body: legacyPayload })).status).toBe(410);
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("does not treat an existing city's valid admin token as permission to create cities", async () => {
    const headers = { Authorization: `Bearer ${adminTokenForHash(existingCity.passwordHash)}` };
    expect((await request("/tenants", { body: legacyPayload, headers })).status).toBe(410);
    expect((await request("/tenants", {
      host: "austin.eventcarpooling.com", body: legacyPayload, headers,
    })).status).toBe(403);
    expect(mocks.rows).toHaveLength(3);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("does not grant admin access or resolve a new city after a signup attempt", async () => {
    await request("/tenants", { body: legacyPayload });
    expect((await request("/test-admin", { host: "unreviewed.eventcarpooling.com",
      headers: { Authorization: `Bearer ${adminTokenForHash(legacyPayload.adminPassword)}` },
    })).status).toBe(404);
    expect((await request("/tenant/config?slug=unreviewed")).status).toBe(404);
    expect((await request("/test-admin", { host: "austin.eventcarpooling.com",
      headers: { Authorization: `Bearer ${adminTokenForHash(legacyPayload.adminPassword)}` },
    })).status).toBe(401);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("keeps anonymous two-field city requests public without provisioning a tenant", async () => {
    const response = await request("/city-requests", {
      body: { cityName: " Unreviewed City ", email: " REQUESTER@example.invalid " },
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ saved: true });
    expect(submit).toHaveBeenCalledWith({
      cityName: "Unreviewed City", email: "requester@example.invalid",
    }, expect.any(String));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.rows.map(row => row.slug)).not.toContain("unreviewed");
    expect((await request("/city-requests", { host: "austin.eventcarpooling.com",
      body: { cityName: "Other City", email: "requester@example.invalid" },
    })).status).toBe(403);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("keeps public tenant list and config available without exposing credentials", async () => {
    const list = await request("/tenants/list");
    expect(list.status).toBe(200);
    const listing = await list.json() as { tenants: { slug: string }[] };
    expect(listing.tenants.map(row => row.slug)).toEqual(["austin", "managed"]);
    const config = await request("/tenant/config?slug=austin", { host: "austin.eventcarpooling.com" });
    expect(config.status).toBe(200);
    const text = await config.text();
    expect(JSON.parse(text).tenant).toMatchObject({ slug: "austin", hasEmailAdmin: true });
    expect(text).not.toMatch(/passwordHash|synthetic-existing|existing@example/);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("keeps existing password-based and managed-city admin access intact", async () => {
    for (const [slug, token] of [
      ["austin", adminTokenForHash(existingCity.passwordHash)],
      ["managed", adminTokenForEmail("managed@example.invalid", 2)],
    ]) {
      const response = await request("/test-admin", {
        host: `${slug}.eventcarpooling.com`, headers: { Authorization: `Bearer ${token}` },
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ authenticated: true });
    }
    expect((await request("/test-admin", { host: "austin.eventcarpooling.com" })).status).toBe(401);
    expect(mocks.rows[0]).toEqual(existingCity);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("preserves previously issued verification links without creating unknown cities", async () => {
    const token = (slug: string) => createHmac("sha256", "synthetic-test-secret-only")
      .update(`verify:${slug}`).digest("hex");
    mocks.update.mockImplementation(() => ({
      set: (values: Record<string, unknown>) => ({
        where: async (predicate: Predicate) => {
          mocks.rows.filter(row => matches(row, predicate)).forEach(row => Object.assign(row, values));
        },
      }),
    }));
    const response = await request(`/tenants/verify?slug=pending&token=${token("pending")}`);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://pending.eventcarpooling.com/admin?verified=1");
    expect(mocks.rows[2]).toMatchObject({
      isActive: true, emailVerified: true, passwordHash: existingCity.passwordHash,
    });
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect((await request(`/tenants/verify?slug=unreviewed&token=${token("unreviewed")}`)).status).toBe(404);
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });
});
