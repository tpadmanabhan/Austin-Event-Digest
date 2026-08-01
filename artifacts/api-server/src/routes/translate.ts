import { Router } from "express";
import OpenAI from "openai";
import { logger } from "../lib/logger";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

/**
 * POST /api/translate
 * Translates an array of texts using OpenAI gpt-5-nano (fastest/cheapest).
 * Used by the Tokyo site's EN/JA language toggle.
 * Body: { texts: string[], targetLang?: "ja" | "en" }
 * Response: { translations: string[] }
 */
router.post("/translate", async (req, res) => {
  const { texts, targetLang = "ja" } = req.body ?? {};

  if (!Array.isArray(texts) || texts.length === 0) {
    res.status(400).json({ error: "texts array required" });
    return;
  }

  const batch = (texts as string[]).slice(0, 60).filter(Boolean);

  if (!process.env["AI_INTEGRATIONS_OPENAI_API_KEY"]) {
    res.json({ translations: batch });
    return;
  }

  try {
    const langName = targetLang === "ja" ? "Japanese" : "English";
    const numbered = batch.map((t, i) => `${i + 1}. ${t}`).join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        {
          role: "system",
          content: `You are a translator. Translate the numbered event titles/descriptions to ${langName}. Return ONLY the numbered translations in the same format. Preserve event names, venue names, and proper nouns where appropriate.`,
        },
        { role: "user", content: numbered },
      ],
    });

    const content = completion.choices?.[0]?.message?.content ?? "";

    // Parse "1. text", "2. text" … lines
    const lines = content.split("\n").filter(l => /^\d+\./.test(l.trim()));
    const translations = lines.map(l => l.replace(/^\d+\.\s*/, "").trim());

    // Pad to input length in case the model collapsed some lines
    while (translations.length < batch.length) {
      translations.push(batch[translations.length] ?? "");
    }

    res.json({ translations: translations.slice(0, batch.length) });
  } catch (err) {
    logger.warn({ err }, "Translation failed — returning originals");
    res.json({ translations: batch });
  }
});

export default router;
