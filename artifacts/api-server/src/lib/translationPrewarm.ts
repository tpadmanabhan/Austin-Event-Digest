/**
 * Pre-warms the server-side translation_cache table for Tokyo event cards.
 * Called fire-and-forget after a Tokyo digest is imported/generated so the
 * first page load is instant rather than waiting on the OpenAI API.
 */
import OpenAI from "openai";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { type EventItem } from "@workspace/db";
import { logger } from "./logger";

const openai = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

async function dbCacheSetMany(
  pairs: Array<{ source: string; translated: string }>,
  targetLang: string,
): Promise<void> {
  for (const { source, translated } of pairs) {
    await db.execute(sql`
      INSERT INTO translation_cache (source_text, target_lang, translated_text, created_at)
      VALUES (${source}, ${targetLang}, ${translated}, NOW())
      ON CONFLICT (source_text, target_lang) DO UPDATE
        SET translated_text = EXCLUDED.translated_text,
            created_at = NOW()
    `);
  }
}

async function dbCacheHas(texts: string[], targetLang: string): Promise<Set<string>> {
  const cached = new Set<string>();
  if (!texts.length) return cached;
  try {
    await Promise.all(
      texts.map(async (text) => {
        const rows = await db.execute(sql`
          SELECT 1 FROM translation_cache
          WHERE source_text = ${text} AND target_lang = ${targetLang}
          LIMIT 1
        `);
        if (rows.rows.length > 0) cached.add(text);
      }),
    );
  } catch { /* table may not exist yet */ }
  return cached;
}

/**
 * Translates all event titles + descriptions in a digest to Japanese and
 * stores results in the DB cache. Already-cached texts are skipped.
 */
export async function prewarmTranslationCache(events: EventItem[]): Promise<void> {
  if (!process.env["AI_INTEGRATIONS_OPENAI_API_KEY"]) return;

  const allTexts = [
    ...events.map(e => e.title).filter(Boolean),
    ...events.map(e => e.description ?? "").filter(Boolean),
  ] as string[];

  if (!allTexts.length) return;

  try {
    const alreadyCached = await dbCacheHas(allTexts, "ja");
    const uncached = allTexts.filter(t => !alreadyCached.has(t));
    if (!uncached.length) {
      logger.info({ count: allTexts.length }, "Translation prewarm: all texts already cached");
      return;
    }

    // Single batched call — titles first, then descriptions
    const numbered = uncached.map((t, i) => `${i + 1}. ${t}`).join("\n");
    const completion = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        {
          role: "system",
          content: "You are a translator. Translate the numbered event titles/descriptions to Japanese. Return ONLY the numbered translations in the same format. Preserve event names, venue names, and proper nouns where appropriate.",
        },
        { role: "user", content: numbered },
      ],
    });

    const content = completion.choices?.[0]?.message?.content ?? "";
    const lines = content.split("\n").filter(l => /^\d+\./.test(l.trim()));
    const translations = lines.map(l => l.replace(/^\d+\.\s*/, "").trim());

    while (translations.length < uncached.length) {
      translations.push(uncached[translations.length] ?? "");
    }

    const toStore = uncached
      .map((t, i) => ({ source: t, translated: translations[i] ?? t }))
      .filter(p => p.translated && p.translated !== p.source);

    await dbCacheSetMany(toStore, "ja");
    logger.info({ stored: toStore.length, skipped: alreadyCached.size }, "Translation prewarm complete");
  } catch (err) {
    logger.warn({ err }, "Translation prewarm failed (non-fatal)");
  }
}
