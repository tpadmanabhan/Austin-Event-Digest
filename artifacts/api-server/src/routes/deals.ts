import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, submittedDealsTable } from "@workspace/db";
import { desc, asc } from "drizzle-orm";
import OpenAI from "openai";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router: IRouter = Router();

const openai = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

const objectStorageService = new ObjectStorageService();

const SubmitDealBody = z.object({
  firstName: z.string().min(1).max(100),
  email: z.string().email(),
  locationName: z.string().min(1).max(200),
  locationAddress: z.string().min(1).max(300),
  objectPath: z.string().min(1), // e.g. /objects/<uuid>
});

/**
 * GET /deals/submitted
 * Returns all community-submitted deals (public-safe — no name/email).
 */
router.get("/deals/submitted", async (req, res) => {
  try {
    const deals = await db
      .select({
        id: submittedDealsTable.id,
        business: submittedDealsTable.business,
        deal: submittedDealsTable.deal,
        savings: submittedDealsTable.savings,
        day: submittedDealsTable.day,
        locationName: submittedDealsTable.locationName,
        locationAddress: submittedDealsTable.locationAddress,
        imageUrl: submittedDealsTable.imageUrl,
        createdAt: submittedDealsTable.createdAt,
      })
      .from(submittedDealsTable)
      .orderBy(asc(submittedDealsTable.createdAt));

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

  const { firstName, email, locationName, locationAddress, objectPath } = parsed.data;

  try {
    // ── Download image from GCS and convert to base64 ──────────────────────
    let imageBase64: string | null = null;
    let imageMime = "image/jpeg";

    try {
      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
      const response = await objectStorageService.downloadObject(objectFile);
      if (response.ok && response.body) {
        const arrayBuffer = await response.arrayBuffer();
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
          max_tokens: 300,
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
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.business) business = String(parsed.business).slice(0, 200);
          if (parsed.deal) deal = String(parsed.deal).slice(0, 300);
          if (parsed.savings) savings = String(parsed.savings).slice(0, 100);
          if (parsed.day && /^(MON|TUE|WED|THU|FRI|SAT|SUN|ANY DAY|WEEKLY)$/i.test(parsed.day.trim())) {
            day = parsed.day.trim().toUpperCase();
          }
        }
      } catch (aiErr) {
        req.log.warn({ err: aiErr }, "OpenAI vision analysis failed — using defaults");
      }
    }

    // Build the serving URL for the image (served via /api/storage/objects/...)
    // objectPath is like /objects/<uuid>, serving URL is /api/storage + objectPath
    const imageUrl = `/api/storage${objectPath}`;

    // ── Save to DB ──────────────────────────────────────────────────────────
    const [inserted] = await db
      .insert(submittedDealsTable)
      .values({
        business,
        deal,
        savings,
        day,
        locationName,
        locationAddress,
        imageUrl,
        submitterName: firstName,
        submitterEmail: email,
      })
      .returning({
        id: submittedDealsTable.id,
        business: submittedDealsTable.business,
        deal: submittedDealsTable.deal,
        savings: submittedDealsTable.savings,
        day: submittedDealsTable.day,
        locationName: submittedDealsTable.locationName,
        locationAddress: submittedDealsTable.locationAddress,
        imageUrl: submittedDealsTable.imageUrl,
        createdAt: submittedDealsTable.createdAt,
      });

    req.log.info({ id: inserted.id, business, locationName }, "Community deal submitted");
    res.json({ success: true, deal: inserted });
  } catch (err) {
    req.log.error({ err }, "Error submitting deal");
    res.status(500).json({ error: "server_error", message: "Failed to submit deal" });
  }
});

export default router;
