import express from "express";
import type { Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/emailService", () => ({
  sendEmail: vi.fn(() => { throw new Error("Unexpected real email attempt"); }),
}));

import {
  buildGolfCourseRequestEmail,
  GolfCourseRequestLimitError,
  GOLF_COURSE_REQUEST_RECIPIENT,
  validateGolfCourseRequest,
} from "../lib/golfCourseRequests";
import type { saveGolfCourseRequest } from "../lib/golfCourseRequests";
import { createGolfCourseRequestsRouter } from "./golfCourseRequests";

const valid = {
  courseName: "Lions Municipal Golf Course",
  address: "2901 Enfield Rd, Austin, TX 78703",
  email: "golfer@example.com",
};

describe("Golf course request validation and email content", () => {
  it("normalizes course details and optional links", () => {
    expect(validateGolfCourseRequest({
      ...valid,
      courseName: " Lions   Municipal Golf Course ",
      email: " GOLFER@Example.com ",
      courseWebsite: "https://example.com/course",
      bookingUrl: "",
      submitterName: " Alex ",
      notes: " Public tee times  available ",
    })).toEqual({
      courseName: "Lions Municipal Golf Course",
      address: valid.address,
      email: "golfer@example.com",
      courseWebsite: "https://example.com/course",
      submitterName: "Alex",
      notes: "Public tee times available",
    });
  });

  it.each([
    null,
    [],
    {},
    { ...valid, courseName: "A" },
    { ...valid, address: "TX" },
    { ...valid, courseName: "12345" },
    { ...valid, email: "not-an-email" },
    { ...valid, courseName: "Lions\nBcc:attacker@example.com" },
    { ...valid, bookingUrl: "javascript:alert(1)" },
    { ...valid, courseWebsite: "https://user:pass@example.com" },
    { ...valid, unexpected: "value" },
  ])("rejects invalid or unexpected fields: %j", (input) => {
    expect(validateGolfCourseRequest(input)).toBeNull();
  });

  it("sends a fixed-recipient Golf IRL email with escaped fields and no auto-add claim", () => {
    const input = validateGolfCourseRequest({
      ...valid,
      courseName: '<Lions & "Friends">',
      notes: "<script>alert(1)</script>",
    });
    expect(input).not.toBeNull();
    const message = buildGolfCourseRequestEmail(input!, 9);
    expect(message.to).toBe(GOLF_COURSE_REQUEST_RECIPIENT);
    expect(message.fromName).toBe("Golf IRL");
    expect(message.html).toContain("&lt;Lions &amp; &quot;Friends&quot;&gt;");
    expect(message.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(message.html).not.toContain('<script>alert(1)</script>');
    expect(message.text).toContain("No course was automatically added.");
  });
});

describe("Golf-only public course request endpoint", () => {
  const submit = vi.fn<typeof saveGolfCourseRequest>();
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      Object.assign(req, { log: { error: vi.fn() } });
      const slug = req.headers["x-test-city"];
      if (typeof slug === "string") Object.assign(req, { tenant: { slug } });
      next();
    });
    app.use("/api", createGolfCourseRequestsRouter(submit));
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test port missing");
    baseUrl = `http://127.0.0.1:${address.port}/api/golf-course-requests`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));
  beforeEach(() => { submit.mockReset(); });

  function request(body: unknown, slug?: string) {
    return fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(slug ? { "x-test-city": slug } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  it("saves valid suggestions only for the Golf tenant", async () => {
    submit.mockResolvedValue({ saved: true, duplicate: false, notificationStatus: "sent" });
    const response = await request({ ...valid, email: " GOLFER@example.com " }, "golf");
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ saved: true, duplicate: false, notificationStatus: "sent" });
    expect(submit).toHaveBeenCalledWith({ ...valid, email: "golfer@example.com" }, expect.any(String));
  });

  it("rejects root-domain and non-Golf submissions before saving", async () => {
    expect((await request(valid)).status).toBe(404);
    expect((await request(valid, "austin")).status).toBe(403);
    expect(submit).not.toHaveBeenCalled();
  });

  it("rejects invalid links and reports duplicates without a second send", async () => {
    expect((await request({ ...valid, bookingUrl: "javascript:alert(1)" }, "golf")).status).toBe(400);
    submit.mockResolvedValue({ saved: true, duplicate: true, notificationStatus: "failed" });
    const response = await request(valid, "golf");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ saved: true, duplicate: true, notificationStatus: "failed" });
  });

  it("reports rate limits and database failures accurately", async () => {
    submit.mockImplementation(async () => { throw new GolfCourseRequestLimitError("Please try again later."); });
    const limited = await request(valid, "golf");
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("3600");

    submit.mockImplementation(async () => { throw new Error("Database unavailable"); });
    const failed = await request(valid, "golf");
    expect(failed.status).toBe(503);
    expect(await failed.json()).toMatchObject({ error: "save_failed" });
  });
});
