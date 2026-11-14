import { createHmac } from "node:crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { db, golfCourseRequestsTable } from "@workspace/db";
import { SubmitGolfCourseRequestBody } from "@workspace/api-zod";
import type { GolfCourseRequestInput, GolfCourseRequestReceipt } from "@workspace/api-zod";
import { CITY_REQUEST_RECIPIENT } from "./cityRequests";
import { sendEmail } from "./emailService";
import { logger } from "./logger";

const HOUR_MS = 60 * 60 * 1000;
export const GOLF_COURSE_REQUEST_RECIPIENT = CITY_REQUEST_RECIPIENT;

export class GolfCourseRequestLimitError extends Error {}

function normalizeText(value: unknown): string | undefined | null {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;
  const normalized = value.normalize("NFKC").trim().replace(/\s+/gu, " ");
  return normalized || undefined;
}

function normalizeHttpUrl(value: unknown): string | undefined | null {
  const normalized = normalizeText(value);
  if (normalized === null || normalized === undefined) return normalized;
  if (normalized.length > 500) return null;
  try {
    const parsed = new URL(normalized);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function validateGolfCourseRequest(body: unknown): GolfCourseRequestInput | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const raw = body as Record<string, unknown>;
  const allowedFields = new Set([
    "courseName", "address", "courseWebsite", "bookingUrl", "submitterName", "email", "notes",
  ]);
  if (Object.keys(raw).some(key => !allowedFields.has(key))) return null;
  const rawTextValues = [
    raw.courseName, raw.address, raw.courseWebsite, raw.bookingUrl,
    raw.submitterName, raw.email, raw.notes,
  ];
  if (rawTextValues.some(value => value !== undefined && typeof value !== "string")
    || rawTextValues.some(value => typeof value === "string" && /[\u0000-\u001f\u007f]/u.test(value))) {
    return null;
  }

  const courseWebsite = normalizeHttpUrl(raw.courseWebsite);
  const bookingUrl = normalizeHttpUrl(raw.bookingUrl);
  if (courseWebsite === null || bookingUrl === null) return null;

  const parsed = SubmitGolfCourseRequestBody.strict().safeParse({
    courseName: normalizeText(raw.courseName),
    address: normalizeText(raw.address),
    ...(courseWebsite ? { courseWebsite } : {}),
    ...(bookingUrl ? { bookingUrl } : {}),
    ...(normalizeText(raw.submitterName) ? { submitterName: normalizeText(raw.submitterName)! } : {}),
    email: typeof raw.email === "string" ? raw.email.trim().toLowerCase() : raw.email,
    ...(normalizeText(raw.notes) ? { notes: normalizeText(raw.notes)! } : {}),
  });
  if (!parsed.success || !/\p{L}/u.test(parsed.data.courseName)) return null;
  return parsed.data;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

function emailLink(label: string, url?: string): string {
  return url
    ? `<p><strong>${escapeHtml(label)}:</strong> <a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>`
    : `<p><strong>${escapeHtml(label)}:</strong> Not provided</p>`;
}

export function buildGolfCourseRequestEmail(input: GolfCourseRequestInput, requestId: number) {
  const submitter = input.submitterName
    ? `${input.submitterName} <${input.email}>`
    : input.email;
  const lines = [
    `Golf course suggestion #${requestId}`,
    `Course: ${input.courseName}`,
    `Address: ${input.address}`,
    `Course website: ${input.courseWebsite ?? "Not provided"}`,
    `Tee-time / booking link: ${input.bookingUrl ?? "Not provided"}`,
    `Submitted by: ${submitter}`,
    `Notes: ${input.notes ?? "Not provided"}`,
    "",
    "Saved for manual review. No course was automatically added.",
  ];
  return {
    to: GOLF_COURSE_REQUEST_RECIPIENT,
    fromName: "Golf IRL",
    subject: `Golf course suggestion: ${input.courseName}`,
    text: lines.join("\n"),
    html: [
      `<h1>New Austin-area golf course suggestion</h1>`,
      `<p><strong>Request:</strong> ${requestId}</p>`,
      `<p><strong>Course:</strong> ${escapeHtml(input.courseName)}</p>`,
      `<p><strong>Address:</strong> ${escapeHtml(input.address)}</p>`,
      emailLink("Course website", input.courseWebsite),
      emailLink("Tee-time / booking link", input.bookingUrl),
      `<p><strong>Submitted by:</strong> ${escapeHtml(submitter)}</p>`,
      `<p><strong>Notes:</strong> ${escapeHtml(input.notes ?? "Not provided")}</p>`,
      `<p>Saved for manual review. No course was automatically added.</p>`,
    ].join(""),
  };
}

async function reserveRequest(input: GolfCourseRequestInput, ip: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Golf course request rate-limit secret is not configured");
  const ipHash = createHmac("sha256", secret).update(ip).digest("hex");
  const courseKey = `${input.courseName.toLowerCase()}|${input.address.toLowerCase()}`;

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(73821, 2)`);
    const [existing] = await tx.select().from(golfCourseRequestsTable).where(and(
      eq(golfCourseRequestsTable.courseKey, courseKey),
      eq(golfCourseRequestsTable.email, input.email),
    )).limit(1);
    if (existing) return { request: existing, duplicate: true };

    const cutoff = new Date(Date.now() - HOUR_MS);
    const [counts] = await tx.select({
      total: sql<number>`count(*)::int`,
      ip: sql<number>`count(*) filter (where ${golfCourseRequestsTable.ipHash} = ${ipHash})::int`,
      email: sql<number>`count(*) filter (where ${golfCourseRequestsTable.email} = ${input.email})::int`,
    }).from(golfCourseRequestsTable).where(gte(golfCourseRequestsTable.createdAt, cutoff));
    if (counts.total >= 30 || counts.ip >= 5 || counts.email >= 3) {
      throw new GolfCourseRequestLimitError("Too many course suggestions. Please try again in an hour.");
    }

    const [request] = await tx.insert(golfCourseRequestsTable).values({
      courseName: input.courseName,
      courseKey,
      address: input.address,
      courseWebsite: input.courseWebsite ?? null,
      bookingUrl: input.bookingUrl ?? null,
      submitterName: input.submitterName ?? null,
      email: input.email,
      notes: input.notes ?? null,
      ipHash,
      notificationStatus: "unconfirmed",
    }).returning();
    return { request, duplicate: false };
  });
}

async function deliverRequestEmail(
  input: GolfCourseRequestInput,
  requestId: number,
  send: typeof sendEmail,
  timeoutMs: number,
): Promise<GolfCourseRequestReceipt["notificationStatus"]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      send(buildGolfCourseRequestEmail(input, requestId)),
      new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), timeoutMs); }),
    ]);
    return result ? (result.success ? "sent" : "failed") : "unconfirmed";
  } catch {
    logger.warn({ requestId }, "Golf course request email acceptance unconfirmed; not automatically retried");
    return "unconfirmed";
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function saveGolfCourseRequest(
  input: GolfCourseRequestInput,
  ip: string,
  options: { send?: typeof sendEmail; timeoutMs?: number } = {},
): Promise<GolfCourseRequestReceipt> {
  const { request, duplicate } = await reserveRequest(input, ip);
  if (duplicate) {
    return { saved: true, duplicate: true, notificationStatus: request.notificationStatus };
  }

  let notificationStatus = await deliverRequestEmail(
    input,
    request.id,
    options.send ?? sendEmail,
    options.timeoutMs ?? 12000,
  );
  try {
    await db.update(golfCourseRequestsTable).set({
      notificationStatus,
      notifiedAt: notificationStatus === "sent" ? new Date() : null,
    }).where(eq(golfCourseRequestsTable.id, request.id));
  } catch {
    logger.error({ requestId: request.id }, "Golf course request saved; notification status could not be recorded");
    notificationStatus = "unconfirmed";
  }
  return { saved: true, duplicate: false, notificationStatus };
}
