import express from "express";
import type { Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// No real provider may be invoked by any test, including failure/retry paths.
vi.mock("../lib/emailService", () => ({
  sendEmail: vi.fn(() => { throw new Error("Unexpected real email attempt"); }),
}));

import { createCityRequestsRouter } from "./cityRequests";
import { buildCityRequestEmail, CITY_REQUEST_RECIPIENT, CityRequestLimitError, validateCityRequest } from "../lib/cityRequests";
import type { saveCityRequest } from "../lib/cityRequests";

describe("city request validation and notification content", () => {
  it("needs only city and email, normalizes international city names", () => {
    expect(validateCityRequest({ cityName: "  São   Paulo  ", email: " HELLO@Example.com " }))
      .toEqual({ cityName: "São Paulo", email: "hello@example.com" });
    expect(validateCityRequest({ cityName: "東京", email: "hello@example.com" })).not.toBeNull();
  });

  it.each([
    null, [], {}, { cityName: "A", email: "hello@example.com" },
    { cityName: "   ", email: "hello@example.com" },
    { cityName: "1234", email: "hello@example.com" },
    { cityName: "A".repeat(101), email: "hello@example.com" },
    { cityName: "London", email: "not-an-email" },
    { cityName: "London", email: `${"a".repeat(250)}@example.com` },
    { cityName: "London\nBcc: attacker", email: "hello@example.com" },
    { cityName: "London", email: "hello@example.com\r\nBcc: attacker" },
    { cityName: "London", email: "hello@example.com", to: "attacker@example.com" },
    { cityName: "London", email: "hello@example.com", adminPassword: "anything" },
  ])("rejects invalid/bounded inputs and additional controls: %j", (input) => {
    expect(validateCityRequest(input)).toBeNull();
  });

  it("escapes HTML while preserving the submitted content and fixed recipient", () => {
    const email = buildCityRequestEmail({ cityName: '<Town & "City">', email: "hello@example.com" }, 7);
    expect(email.to).toBe(CITY_REQUEST_RECIPIENT);
    expect(email.html).toContain("&lt;Town &amp; &quot;City&quot;&gt;");
    expect(email.html).not.toContain('<Town & "City">');
    expect(email.text).toContain('<Town & "City">');
  });
});

describe("platform-root city request HTTP endpoint", () => {
  const submit = vi.fn<typeof saveCityRequest>();
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      Object.assign(req, { log: { error: vi.fn() } });
      if (req.headers["x-test-city"]) Object.assign(req, { tenant: { slug: "austin" } });
      next();
    });
    app.use("/api", createCityRequestsRouter(submit));
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test port missing");
    baseUrl = `http://127.0.0.1:${address.port}/api/city-requests`;
  });
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));
  beforeEach(() => { submit.mockReset(); });

  function request(body: unknown, headers = {}) {
    return fetch(baseUrl, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  }
  const valid = { cityName: "London", email: "hello@example.com" };

  it("returns a saved receipt and normalizes the input", async () => {
    submit.mockResolvedValue({ saved: true, duplicate: false, notificationStatus: "sent" });
    const res = await request({ cityName: " London ", email: " HELLO@example.com " });
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ saved: true, duplicate: false, notificationStatus: "sent" });
    expect(submit).toHaveBeenCalledWith(valid, expect.any(String));
  });
  it("rejects city-subdomain requests without saving or sending", async () => {
    expect((await request(valid, { "x-test-city": "austin" })).status).toBe(403);
    expect(submit).not.toHaveBeenCalled();
  });
  it("rejects invalid fields before saving", async () => {
    expect((await request({ ...valid, email: "invalid" })).status).toBe(400);
    expect(submit).not.toHaveBeenCalled();
  });
  it("returns 200 for duplicates and reports saved-but-not-notified accurately", async () => {
    submit.mockResolvedValue({ saved: true, duplicate: true, notificationStatus: "failed" });
    const res = await request(valid);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ saved: true, duplicate: true, notificationStatus: "failed" });
  });
  it("reports rate limits with a retry interval", async () => {
    submit.mockImplementation(async () => { throw new CityRequestLimitError("Try again in an hour."); });
    const res = await request(valid);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("3600");
  });
  it("does not claim a failed database save succeeded", async () => {
    submit.mockImplementation(async () => { throw new Error("Database unavailable"); });
    const res = await request(valid);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: "save_failed" });
  });
});
