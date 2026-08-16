import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, submittedDealsTable } from "@workspace/db";
import { desc, asc, sql, eq } from "drizzle-orm";
import { requireAdmin } from "../middleware/requireAdmin";
import OpenAI from "openai";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

/** Geocode an address string using Nominatim. Returns null if lookup fails.
 *  Tries the full address first; if Nominatim returns nothing (suite/building
 *  numbers are often not indexed), retries with unit/suite/bldg qualifiers
 *  stripped so the street number + street name still resolves. */
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  // Strip common unit/suite/building qualifiers for the fallback attempt.
  // e.g. "123 Main St, Ste 180, Austin TX" → "123 Main St, Austin TX"
  const simplified = address
    .replace(/,?\s*(Ste|Suite|Apt|Unit|Bldg|Building|Floor|Fl|#)\s*[\w-]+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  const candidates = simplified !== address ? [address, simplified] : [address];

  for (const candidate of candidates) {
    try {
      const encoded = encodeURIComponent(candidate);
      const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`;
      const res = await fetch(url, {
        headers: { "User-Agent": "AustinCares/1.0 (contact@eventcarpooling.com)" },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (data.length) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch {
      // try next candidate
    }
  }
  return null;
}

const router: IRouter = Router();

const openai = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

const objectStorageService = new ObjectStorageService();

// Matches GCS object paths issued by our upload endpoint: /objects/uploads/<uuid>
// Fixed prefix "uploads/" + UUID — prevents path traversal and limits scope to issued upload paths.
const OBJECT_PATH_PATTERN = /^\/objects\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SubmitDealBody = z.object({
  firstName: z.string().min(1).max(100),
  email: z.string().email(),
  locationName: z.string().min(1).max(200),
  locationAddress: z.string().min(1).max(300),
  objectPath: z.string().regex(OBJECT_PATH_PATTERN, {
    message: "objectPath must be a valid upload path (e.g. /objects/<uuid>)",
  }),
  // Optional ISO date string (YYYY-MM-DD) — deal expiry chosen by submitter
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/**
 * GET /deals/submitted
 * Returns all community-submitted deals (public-safe — no name/email).
 */
router.get("/deals/submitted", async (req, res) => {
  try {
    // lat/lng and expires_at are added by startup migration (not in drizzle schema to avoid schema diff on first deploy)
    // Exclude rows whose expires_at is set and already in the past
    const result = await db.execute(sql`
      SELECT id, business, deal, savings, day,
             location_name AS "locationName",
             location_address AS "locationAddress",
             image_url AS "imageUrl",
             lat, lng,
             expires_at AS "expiresAt",
             created_at AS "createdAt"
      FROM submitted_deals
      WHERE (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at ASC
    `);
    // drizzle postgres.js execute returns rows as an array directly
    const deals = Array.isArray(result) ? result : (result as any).rows ?? [];
    res.json({ deals });
  } catch (err) {
    req.log.error({ err }, "Error fetching submitted deals");
    res.status(500).json({ error: "server_error", message: "Failed to fetch deals" });
  }
});

/**
 * POST /deals/submit
 * Accepts form fields + objectPath of the uploaded image.
 * Calls OpenAI vision to extract deal metadata, saves to DB, returns public deal card.
 */
router.post("/deals/submit", async (req, res) => {
  const parsed = SubmitDealBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "invalid_request",
      message: "firstName, email, locationName, locationAddress, and objectPath are required",
    });
    return;
  }
  const { firstName, email, locationName, locationAddress, objectPath, expiresAt } = parsed.data;

  try {
    // ── Download image from GCS and convert to base64 ──────────────────────
    const ALLOWED_MIME = new Set([
      "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif",
    ]);
    const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

    let imageBase64: string | null = null;
    let imageMime = "image/jpeg";

    try {
      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

      // Server-side validation using GCS object metadata — runs before streaming the body
      const [meta] = await objectFile.getMetadata();
      const gcsContentType: string = (meta.contentType as string | undefined) ?? "";
      const gcsSize: number = Number(meta.size ?? 0);

      if (gcsContentType && !ALLOWED_MIME.has(gcsContentType.split(";")[0].trim())) {
        res.status(400).json({
          error: "invalid_request",
          message: `Uploaded file type '${gcsContentType}' is not allowed. Please upload an image.`,
        });
        return;
      }
      if (gcsSize > MAX_BYTES) {
        res.status(400).json({
          error: "invalid_request",
          message: `Uploaded file is too large (${(gcsSize / (1024 * 1024)).toFixed(1)} MB). Maximum is 10 MB.`,
        });
        return;
      }

      const response = await objectStorageService.downloadObject(objectFile);
      if (response.ok && response.body) {
        const arrayBuffer = await response.arrayBuffer();
        // Final size guard after buffering (defence-in-depth against metadata mismatch)
        if (arrayBuffer.byteLength > MAX_BYTES) {
          res.status(400).json({ error: "invalid_request", message: "Uploaded file exceeds the 10 MB limit." });
          return;
        }
        imageBase64 = Buffer.from(arrayBuffer).toString("base64");
        const ct = response.headers.get("content-type");
        if (ct) imageMime = ct.split(";")[0].trim();
      }
    } catch (imgErr) {
      if (imgErr instanceof ObjectNotFoundError) {
        res.status(400).json({ error: "invalid_request", message: "Uploaded image not found. Please try again." });
        return;
      }
      req.log.warn({ err: imgErr }, "Could not download deal image — proceeding without vision analysis");
    }

    // ── OpenAI vision analysis ─────────────────────────────────────────────
    let business = locationName;
    let deal = "Special deal — see location for details";
    let savings = "";
    let day = "ANY DAY";

    if (imageBase64) {
      try {
        const visionRes = await openai.chat.completions.create({
          model: "gpt-5.6-luna",
          max_completion_tokens: 300,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: `data:${imageMime};base64,${imageBase64}`, detail: "low" },
                },
                {
                  type: "text",
                  text: `This is a photo of a deal or discount offer at a local business. 
Extract the following and respond ONLY with valid JSON (no markdown):
{
  "business": "<business or restaurant name, or use '${locationName}' if not visible>",
  "deal": "<one-sentence description of what the deal is>",
  "savings": "<price, discount percentage, or savings amount — e.g. '$5 off', '20% discount', '$11.95 all-day' — empty string if unclear>",
  "day": "<which day(s) the deal is valid — use one of: MON, TUE, WED, THU, FRI, SAT, SUN, ANY DAY, WEEKLY — default to ANY DAY if not specified>"
}`,
                },
              ],
            },
          ],
        });

        const text = visionRes.choices[0]?.message?.content?.trim() ?? "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const aiParsed = JSON.parse(jsonMatch[0]);
          if (aiParsed.business) business = String(aiParsed.business).slice(0, 200);
          if (aiParsed.deal) deal = String(aiParsed.deal).slice(0, 300);
          if (aiParsed.savings) savings = String(aiParsed.savings).slice(0, 100);
          if (aiParsed.day && /^(MON|TUE|WED|THU|FRI|SAT|SUN|ANY DAY|WEEKLY)$/i.test(aiParsed.day.trim())) {
            day = aiParsed.day.trim().toUpperCase();
          }
        }
      } catch (aiErr) {
        req.log.warn({ err: aiErr }, "OpenAI vision analysis failed — using defaults");
      }
    }

    // Build the serving URL for the image (served via /api/storage/objects/...)
    // objectPath is like /objects/<uuid>, serving URL is /api/storage + objectPath
    const imageUrl = `/api/storage${objectPath}`;

    // ── Geocode the address so the pin appears on the map ──────────────────
    const coords = await geocodeAddress(locationAddress);
    if (!coords) {
      req.log.warn({ locationAddress }, "Geocoding failed for submitted deal address — pin will not show on map");
    }

    // ── Save to DB ──────────────────────────────────────────────────────────
    // lat/lng and expires_at inserted via raw SQL (columns added by startup migration, not in drizzle schema)
    const lat = coords?.lat ?? null;
    const lng = coords?.lng ?? null;
    // Parse expiresAt date string into a Date (or null if not provided)
    const expiresAtDate = expiresAt ? new Date(`${expiresAt}T23:59:59`) : null;
    const insertResult = await db.execute(sql`
      INSERT INTO submitted_deals
        (business, deal, savings, day, location_name, location_address, image_url, lat, lng, submitter_name, submitter_email, expires_at, status)
      VALUES
        (${business}, ${deal}, ${savings}, ${day}, ${locationName}, ${locationAddress}, ${imageUrl}, ${lat}, ${lng}, ${firstName}, ${email}, ${expiresAtDate}, 'approved')
      RETURNING
        id, business, deal, savings, day,
        location_name AS "locationName",
        location_address AS "locationAddress",
        image_url AS "imageUrl",
        lat, lng,
        expires_at AS "expiresAt",
        created_at AS "createdAt"
    `);
    const rows = Array.isArray(insertResult) ? insertResult : (insertResult as any).rows ?? [];
    const inserted = rows[0];

    req.log.info({ id: inserted?.id, business, locationName, lat, lng }, "Community deal submitted");
    res.json({ success: true, deal: inserted });
  } catch (err) {
    req.log.error({ err }, "Error submitting deal");
    res.status(500).json({ error: "server_error", message: "Failed to submit deal" });
  }
});

/**
 * PATCH /admin/deals/:id
 * Admin endpoint to correct a submitted deal's fields.
 * Accepts any subset of: business, deal, savings, day, locationName, locationAddress.
 */
const PatchDealBody = z.object({
  business: z.string().min(1).max(200).optional(),
  deal: z.string().min(1).max(500).optional(),
  savings: z.string().max(100).optional(),
  day: z.string().max(50).optional(),
  locationName: z.string().max(200).optional(),
  locationAddress: z.string().max(300).optional(),
});

router.patch("/admin/deals/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_request", message: "Invalid deal id" });
    return;
  }
  const parsed = PatchDealBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: parsed.error.message });
    return;
  }
  if (Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "invalid_request", message: "No fields to update" });
    return;
  }
  try {
    const f = parsed.data;
    // Build SET clauses using drizzle sql template tag for safe parameterization
    const parts: ReturnType<typeof sql>[] = [];
    if (f.business !== undefined)        parts.push(sql`business = ${f.business}`);
    if (f.deal !== undefined)            parts.push(sql`deal = ${f.deal}`);
    if (f.savings !== undefined)         parts.push(sql`savings = ${f.savings}`);
    if (f.day !== undefined)             parts.push(sql`day = ${f.day}`);
    if (f.locationName !== undefined)    parts.push(sql`location_name = ${f.locationName}`);
    if (f.locationAddress !== undefined) parts.push(sql`location_address = ${f.locationAddress}`);

    // Join SET clauses with commas
    const setClause = sql.join(parts, sql`, `);
    await db.execute(sql`UPDATE submitted_deals SET ${setClause} WHERE id = ${id}`);

    req.log.info({ id, fields: f }, "Admin patched submitted deal");
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error patching deal");
    res.status(500).json({ error: "server_error", message: "Failed to patch deal" });
  }
});

export default router;
