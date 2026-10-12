import { createHmac } from "node:crypto";
import { and, eq, gte, or, sql } from "drizzle-orm";
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

export function buildCityRequestAcknowledgement(input: CityRequestInput, requestId: number) {
  return {
    to: input.email,
    fromName: "EventCarpooling",
    subject: `${input.cityName} city request received`,
    text: `Thank you for requesting ${input.cityName} on EventCarpooling.\n\nYour request #${requestId} has been saved for manual review. Our team will follow up at this email address about next steps.\n\nThis is an acknowledgement, not an approval. No city website or account has been created.\n\nThe EventCarpooling team`,
    html: `<div style="font-family:Georgia,serif;max-width:600px;margin:auto;color:#1a1a1a;line-height:1.7"><h1>City request received</h1><p>Thank you for requesting <strong>${escapeHtml(input.cityName)}</strong> on EventCarpooling.</p><p>Your request #${requestId} has been saved for manual review. Our team will follow up at this email address about next steps.</p><p>This is an acknowledgement, not an approval. No city website or account has been created.</p><p>The EventCarpooling team</p></div>`,
  };
}

/**
 * A short transaction serializes admission, counts durable limits, and reserves
 * one attempt per recipient. The lock is released BEFORE email delivery.
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
    if (existing && existing.acknowledgementStatus !== "not_sent") {
      return { request: existing, duplicate: true, sendAcknowledgement: false };
    }

    const cutoff = new Date(Date.now() - HOUR_MS);
    const [counts] = await tx.select({
      total: sql<number>`count(*)::int`,
      ip: sql<number>`count(*) filter (where ${cityRequestsTable.ipHash} = ${ipHash})::int`,
      email: sql<number>`count(*) filter (where ${cityRequestsTable.email} = ${input.email})::int`,
    }).from(cityRequestsTable).where(or(
      gte(cityRequestsTable.createdAt, cutoff),
      gte(cityRequestsTable.acknowledgementAttemptedAt, cutoff),
    ));
    if (counts.total >= 30 || counts.ip >= 5 || counts.email >= 3) {
      throw new CityRequestLimitError("Too many city requests. Please try again in an hour.");
    }
    if (existing) {
      const [request] = await tx.update(cityRequestsTable).set({
        acknowledgementStatus: "unconfirmed",
        acknowledgementAttemptedAt: new Date(),
      }).where(eq(cityRequestsTable.id, existing.id)).returning();
      return { request, duplicate: true, sendAcknowledgement: true };
    }
    const [request] = await tx.insert(cityRequestsTable).values({
      ...input, cityKey, ipHash, notificationStatus: "unconfirmed",
      acknowledgementStatus: "unconfirmed", acknowledgementAttemptedAt: new Date(),
    }).returning();
    return { request, duplicate: false, sendAcknowledgement: true };
  });
}

async function deliverRequestEmail(
  message: ReturnType<typeof buildCityRequestEmail>,
  requestId: number,
  send: typeof sendEmail,
  timeoutMs: number,
): Promise<CityRequestReceipt["notificationStatus"]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      send(message),
      new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), timeoutMs); }),
    ]);
    return result ? (result.success ? "sent" : "failed") : "unconfirmed";
  } catch {
    logger.warn({ requestId }, "City request email acceptance unconfirmed; not automatically retried");
    return "unconfirmed";
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function saveCityRequest(
  input: CityRequestInput,
  ip: string,
  // Injection is for mocked-delivery tests; the public route never supplies it.
  options: { send?: typeof sendEmail; timeoutMs?: number } = {},
): Promise<CityRequestReceipt> {
  const { request, duplicate, sendAcknowledgement } = await reserveRequest(input, ip);
  if (!sendAcknowledgement) {
    return {
      saved: true, duplicate, notificationStatus: request.notificationStatus,
      acknowledgementStatus: request.acknowledgementStatus,
    };
  }

  const send = options.send ?? sendEmail;
  const timeoutMs = options.timeoutMs ?? 12000;
  // Neither recipient's failure prevents the other delivery.
  let [notificationStatus, acknowledgementStatus] = await Promise.all([
    duplicate ? Promise.resolve(request.notificationStatus)
      : deliverRequestEmail(buildCityRequestEmail(input, request.id), request.id, send, timeoutMs),
    deliverRequestEmail(buildCityRequestAcknowledgement(input, request.id), request.id, send, timeoutMs),
  ]);

  try {
    await db.update(cityRequestsTable).set({
      notificationStatus,
      notifiedAt: duplicate ? request.notifiedAt : notificationStatus === "sent" ? new Date() : null,
      acknowledgementStatus,
      acknowledgedAt: acknowledgementStatus === "sent" ? new Date() : null,
    }).where(eq(cityRequestsTable.id, request.id));
  } catch {
    // The request itself was already committed. Do not turn this into a save failure.
    logger.error({ requestId: request.id }, "City request saved; notification status could not be recorded");
    if (!duplicate) notificationStatus = "unconfirmed";
    acknowledgementStatus = "unconfirmed";
  }
  return { saved: true, duplicate, notificationStatus, acknowledgementStatus };
}
