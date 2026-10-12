import { createHmac } from "node:crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { db, cityRequestsTable } from "@workspace/db";
import { SubmitCityRequestBody } from "@workspace/api-zod";
import type { CityRequestInput, CityRequestReceipt } from "@workspace/api-zod";
import { sendEmail } from "./emailService";
import { logger } from "./logger";

export const CITY_REQUEST_RECIPIENT = "aiimplementationclubaustin@gmail.com";
const HOUR_MS = 60 * 60 * 1000;

export class CityRequestLimitError extends Error {}

export function validateCityRequest(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const raw = body as Record<string, unknown>;
  // Reject control characters before normalization, including mail-header breaks.
  if (typeof raw.cityName !== "string" || typeof raw.email !== "string"
    || /[\u0000-\u001f\u007f]/u.test(raw.cityName + raw.email)
    || raw.cityName.length > 200 || raw.email.length > 300) return null;
  const parsed = SubmitCityRequestBody.strict().safeParse({
    ...raw,
    cityName: raw.cityName.normalize("NFKC").trim().replace(/\s+/gu, " "),
    email: raw.email.trim().toLowerCase(),
  });
  if (!parsed.success || !/\p{L}/u.test(parsed.data.cityName)) return null;
  return parsed.data;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

export function buildCityRequestEmail(input: CityRequestInput, requestId: number) {
  return {
    to: CITY_REQUEST_RECIPIENT,
    fromName: "EventCarpooling",
    subject: `City request: ${input.cityName}`,
    text: `City request #${requestId}\nCity: ${input.cityName}\nEmail: ${input.email}\n\nSaved for manual review. No city or account has been created.`,
    html: `<h1>New city request</h1><p>Request #${requestId}</p><p><strong>City:</strong> ${escapeHtml(input.cityName)}</p><p><strong>Email:</strong> ${escapeHtml(input.email)}</p><p>Saved for manual review. No city or account has been created.</p>`,
  };
}

/**
 * A short transaction serializes admission, counts durable limits, and reserves
 * exactly one notification attempt. The lock is released BEFORE email delivery.
 * The unique index also prevents duplicate requests across workers/restarts.
 */
async function reserveRequest(input: CityRequestInput, ip: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("City request rate-limit secret is not configured");
  const ipHash = createHmac("sha256", secret).update(ip).digest("hex");
  const cityKey = input.cityName.toLowerCase();
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(73821, 1)`);
    const [existing] = await tx.select().from(cityRequestsTable).where(and(
      eq(cityRequestsTable.cityKey, cityKey), eq(cityRequestsTable.email, input.email),
    )).limit(1);
    if (existing) return { request: existing, duplicate: true };

    const [counts] = await tx.select({
      total: sql<number>`count(*)::int`,
      ip: sql<number>`count(*) filter (where ${cityRequestsTable.ipHash} = ${ipHash})::int`,
      email: sql<number>`count(*) filter (where ${cityRequestsTable.email} = ${input.email})::int`,
    }).from(cityRequestsTable).where(gte(cityRequestsTable.createdAt, new Date(Date.now() - HOUR_MS)));
    if (counts.total >= 30 || counts.ip >= 5 || counts.email >= 3) {
      throw new CityRequestLimitError("Too many city requests. Please try again in an hour.");
    }
    const [request] = await tx.insert(cityRequestsTable).values({
      ...input, cityKey, ipHash, notificationStatus: "unconfirmed",
    }).returning();
    return { request, duplicate: false };
  });
}

export async function saveCityRequest(
  input: CityRequestInput,
  ip: string,
  // Injection is for mocked-delivery tests; the public route never supplies it.
  options: { send?: typeof sendEmail; timeoutMs?: number } = {},
): Promise<CityRequestReceipt> {
  const { request, duplicate } = await reserveRequest(input, ip);
  if (duplicate) {
    return { saved: true, duplicate: true, notificationStatus: request.notificationStatus };
  }

  let notificationStatus: CityRequestReceipt["notificationStatus"] = "unconfirmed";
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      (options.send ?? sendEmail)(buildCityRequestEmail(input, request.id)),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), options.timeoutMs ?? 12000);
      }),
    ]);
    if (result) notificationStatus = result.success ? "sent" : "failed";
  } catch {
    // A thrown/network error can be ambiguous: keep the reservation, never resend.
    logger.warn({ requestId: request.id }, "City request saved; notification acceptance unconfirmed");
  } finally {
    if (timer) clearTimeout(timer);
  }

  try {
    await db.update(cityRequestsTable).set({
      notificationStatus,
      notifiedAt: notificationStatus === "sent" ? new Date() : null,
    }).where(eq(cityRequestsTable.id, request.id));
  } catch {
    // The request itself was already committed. Do not turn this into a save failure.
    logger.error({ requestId: request.id }, "City request saved; notification status could not be recorded");
    notificationStatus = "unconfirmed";
  }
  return { saved: true, duplicate: false, notificationStatus };
}
