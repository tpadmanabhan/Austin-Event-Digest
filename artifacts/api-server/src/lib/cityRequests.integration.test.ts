import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db, cityRequestsTable } from "@workspace/db";

vi.mock("./emailService", () => ({
  sendEmail: vi.fn(() => { throw new Error("Real email delivery is forbidden in tests"); }),
}));
import { CityRequestLimitError, saveCityRequest } from "./cityRequests";
import { sendEmail } from "./emailService";

// Opt-in: these tests write only synthetic city_requests and delete their own rows.
describe.skipIf(process.env.RUN_CITY_REQUEST_DB_TESTS !== "1")("durable city request capture with mocked email", () => {
  const marker = `city-request-test-${randomUUID()}`;
  const emails = new Set<string>();
  function input(city = "Test City", email = `${marker}@example.invalid`) {
    emails.add(email);
    return { cityName: city, email };
  }
  function ip(suffix: string) {
    const value = `${marker}-${suffix}`;
    return value;
  }
  afterAll(async () => {
    for (const email of emails) {
      await db.delete(cityRequestsTable).where(eq(cityRequestsTable.email, email));
    }
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("commits before send, reserves one attempt for concurrent requests, and survives retries", async () => {
    const data = input();
    let release!: () => void;
    const wait = new Promise<void>((resolve) => { release = resolve; });
    const send = vi.fn(async () => {
      const [saved] = await db.select().from(cityRequestsTable).where(eq(cityRequestsTable.email, data.email));
      expect(saved.notificationStatus).toBe("unconfirmed");
      await wait;
      return { success: true };
    });
    const first = saveCityRequest(data, ip("concurrent"), { send });
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    const duplicate = await saveCityRequest(data, ip("other-worker"), { send });
    expect(duplicate).toMatchObject({ saved: true, duplicate: true, notificationStatus: "unconfirmed" });
    release();
    expect(await first).toMatchObject({ saved: true, notificationStatus: "sent" });
    const retry = await saveCityRequest({ ...data, cityName: "test city" }, ip("retry"), { send });
    expect(retry).toMatchObject({ duplicate: true, notificationStatus: "sent" });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("keeps failed notifications recorded and never sends again on a retry", async () => {
    const data = input("Failed Email City", `${marker}-failed@example.invalid`);
    const send = vi.fn(async () => ({ success: false, error: "Mock provider outage" }));
    expect(await saveCityRequest(data, ip("failed"), { send })).toMatchObject({ saved: true, notificationStatus: "failed" });
    expect(await saveCityRequest(data, ip("failed-retry"), { send })).toMatchObject({ duplicate: true, notificationStatus: "failed" });
    const [row] = await db.select().from(cityRequestsTable).where(eq(cityRequestsTable.email, data.email));
    expect(row.cityName).toBe(data.cityName);
    expect(row.notifiedAt).toBeNull();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("does not retry provider exceptions or timed-out/uncertain delivery", async () => {
    for (const mode of ["throw", "timeout"]) {
      const data = input(`Uncertain ${mode}`, `${marker}-${mode}@example.invalid`);
      const send = vi.fn(() => mode === "throw"
        ? Promise.reject(new Error("Mock network failure"))
        : new Promise<{ success: boolean }>(() => {}));
      expect(await saveCityRequest(data, ip(mode), { send, timeoutMs: 10 }))
        .toMatchObject({ saved: true, notificationStatus: "unconfirmed" });
      expect(await saveCityRequest(data, ip(`${mode}-retry`), { send }))
        .toMatchObject({ duplicate: true, notificationStatus: "unconfirmed" });
      expect(send).toHaveBeenCalledTimes(1);
    }
  });

  it("enforces durable email and IP limits without tenant or newsletter changes", async () => {
    const fingerprints = () => db.execute(sql`
      SELECT
        (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text, '')) FROM tenants t) AS tenants,
        (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text, '')) FROM digests t) AS digests,
        (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text, '')) FROM subscribers t) AS subscribers
    `);
    const before = await fingerprints();
    const send = vi.fn(async () => ({ success: true }));
    const email = `${marker}-limit@example.invalid`;
    for (let n = 0; n < 3; n++) await saveCityRequest(input(`Limit City ${n}`, email), ip(`email-${n}`), { send });
    await expect(saveCityRequest(input("Limit City 4", email), ip("email-four"), { send }))
      .rejects.toBeInstanceOf(CityRequestLimitError);
    const sharedIp = ip("shared-limit");
    for (let n = 0; n < 5; n++) {
      await saveCityRequest(input(`IP City ${n}`, `${marker}-ip${n}@example.invalid`), sharedIp, { send });
    }
    await expect(saveCityRequest(input("IP City 6", `${marker}-ip6@example.invalid`), sharedIp, { send }))
      .rejects.toBeInstanceOf(CityRequestLimitError);
    expect((await fingerprints()).rows).toEqual(before.rows);
    expect(send).toHaveBeenCalledTimes(8);
  });

  it("bounds total notifications even when callers change IP and email", async () => {
    const batch = Array.from({ length: 30 }, (_, n) => {
      const data = input(`Global Limit ${n}`, `${marker}-global${n}@example.invalid`);
      return { ...data, cityKey: data.cityName.toLowerCase(), ipHash: `${marker}-global-${n}` };
    });
    await db.insert(cityRequestsTable).values(batch);
    const send = vi.fn(async () => ({ success: true }));
    await expect(saveCityRequest(input("Global Limit Extra", `${marker}-global-extra@example.invalid`), ip("global-extra"), { send }))
      .rejects.toBeInstanceOf(CityRequestLimitError);
    expect(send).not.toHaveBeenCalled();
  });
});
