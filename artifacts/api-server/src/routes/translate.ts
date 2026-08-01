import { Router } from "express";
import OpenAI from "openai";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

// ---------------------------------------------------------------------------
// DB-backed translation cache — individual queries per text to avoid
// array-parameter serialisation issues with drizzle's sql template tag
// ---------------------------------------------------------------------------

async function dbCacheGetMany(
  texts: string[],
  targetLang: string,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!texts.length) return out;
  try {
    // Run lookups in parallel — safe because each is a simple point query
    await Promise.all(
      texts.map(async (text) => {
        const rows = await db.execute(sql`
          SELECT translated_text
          FROM translation_cache
          WHERE source_text = ${text}
            AND target_lang = ${targetLang}
          LIMIT 1
        `);
        if (rows.rows.length > 0) {
          out.set(text, (rows.rows[0] as { translated_text: string }).translated_text);
        }
      }),
    );
  } catch {
    // Table may not exist yet on first boot — treat as full miss
  }
  return out;
}

async function dbCacheSetMany(
  pairs: Array<{ source: string; translated: string }>,
  targetLang: string,
): Promise<void> {
  if (!pairs.length) return;
  try {
    await Promise.all(
      pairs.map(({ source, translated }) =>
        db.execute(sql`
          INSERT INTO translation_cache (source_text, target_lang, translated_text, created_at)
          VALUES (${source}, ${targetLang}, ${translated}, NOW())
          ON CONFLICT (source_text, target_lang) DO UPDATE
            SET translated_text = EXCLUDED.translated_text,
                created_at = NOW()
        `),
      ),
    );
  } catch (err) {
    logger.warn({ err }, "Failed to write translation cache");
  }
}

// ---------------------------------------------------------------------------
// Core OpenAI translation — sends ONE numbered batch, returns same-length array
// ---------------------------------------------------------------------------

async function translateWithOpenAI(texts: string[], targetLang: string): Promise<string[]> {
  const langName = targetLang === "ja" ? "Japanese" : "English";
  const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join("\n");

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
  const lines = content.split("\n").filter(l => /^\d+\./.test(l.trim()));
  const translations = lines.map(l => l.replace(/^\d+\.\s*/, "").trim());

  // Pad to input length in case the model collapsed some lines
  while (translations.length < texts.length) {
    translations.push(texts[translations.length] ?? "");
  }

  return translations.slice(0, texts.length);
}

/**
 * POST /api/translate
 * Translates an array of texts using OpenAI gpt-5-nano (fastest/cheapest).
 * Results are cached in the DB so repeat requests are instant.
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
    // 1. Check DB cache for all texts in parallel
    const cached = await dbCacheGetMany(batch, targetLang);
    const uncached = batch.filter(t => !cached.has(t));

    logger.info({ total: batch.length, cached: cached.size, uncached: uncached.length }, "Translation request");

    // 2. Translate only uncached texts via OpenAI
    if (uncached.length > 0) {
      const newTranslations = await translateWithOpenAI(uncached, targetLang);

      // 3. Store new translations in DB cache (skip if translated === original)
      const toStore = uncached
        .map((t, i) => ({ source: t, translated: newTranslations[i] ?? t }))
        .filter(p => p.translated && p.translated !== p.source);

      await dbCacheSetMany(toStore, targetLang);

      // 4. Merge into cached map
      for (const { source, translated } of toStore) {
        cached.set(source, translated);
      }
    }

    // 5. Return in original order
    const translations = batch.map(t => cached.get(t) ?? t);
    res.json({ translations });
  } catch (err) {
    logger.warn({ err }, "Translation failed — returning originals");
    res.json({ translations: batch });
  }
});

export default router;
