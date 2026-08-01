import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

/**
 * POST /api/translate
 * Translates an array of texts using OpenAI (gpt-5-nano for speed/cost).
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
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const baseUrl = (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");

  if (!apiKey) {
    // No key — return originals silently so the UI doesn't break
    res.json({ translations: batch });
    return;
  }

  try {
    const langName = targetLang === "ja" ? "Japanese" : "English";
    const numbered = batch.map((t, i) => `${i + 1}. ${t}`).join("\n");

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-nano",
        messages: [
          {
            role: "system",
            content: `You are a translator. Translate the numbered event titles/descriptions to ${langName}. Return ONLY the numbered translations in the same format. Preserve event names, venue names, and proper nouns where appropriate.`,
          },
          { role: "user", content: numbered },
        ],
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      throw new Error(`OpenAI error ${response.status}`);
    }

    const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    const content = data.choices?.[0]?.message?.content ?? "";

    // Parse "1. text", "2. text" … lines
    const lines = content.split("\n").filter(l => /^\d+\./.test(l.trim()));
    const translations = lines.map(l => l.replace(/^\d+\.\s*/, "").trim());

    // Pad to input length in case OpenAI collapsed some lines
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
