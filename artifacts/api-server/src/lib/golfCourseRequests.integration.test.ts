import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, golfCourseRequestsTable } from "@workspace/db";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "./emailService";
import { saveGolfCourseRequest, validateGolfCourseRequest } from "./golfCourseRequests";

const enabled = process.env.RUN_GOLF_COURSE_REQUEST_DB_TESTS === "1";
const marker = randomUUID();
const email = `golf-request-${marker}@example.invalid`;
const input = validateGolfCourseRequest({
  courseName: `Integration Test Course ${marker}`,
  address: "100 Test Course Road, Austin, TX 78701",
  email,
  notes: "Temporary database integration test",
});

describe.skipIf(!enabled)("Golf course request persistence with mocked email", () => {
  afterEach(async () => {
    await db.delete(golfCourseRequestsTable).where(eq(golfCourseRequestsTable.email, email));
  });

  it("persists the request and does not send a second admin email for duplicates", async () => {
    if (!input) throw new Error("Synthetic integration-test request did not validate");
    const send = vi.fn(async (_message: Parameters<typeof sendEmail>[0]) => ({ success: true }));

    const first = await saveGolfCourseRequest(input, `test-ip-${marker}`, { send });
    expect(first).toEqual({ saved: true, duplicate: false, notificationStatus: "sent" });

    const [stored] = await db.select().from(golfCourseRequestsTable).where(eq(golfCourseRequestsTable.email, email));
    expect(stored).toMatchObject({
      courseName: input.courseName,
      address: input.address,
      email,
      notificationStatus: "sent",
    });

    const duplicate = await saveGolfCourseRequest(input, `other-ip-${marker}`, { send });
    expect(duplicate).toEqual({ saved: true, duplicate: true, notificationStatus: "sent" });
    expect(send).toHaveBeenCalledTimes(1);
  });
});
