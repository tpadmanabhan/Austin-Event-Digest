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
// Response parser — exported so it can be unit-tested independently
// ---------------------------------------------------------------------------

export interface ParsedTranslationResponse {
  /** Translations in 1-based order; entry is undefined if index was missing/invalid */
  byIndex: Map<number, string>;
  /** Number of top-level numbered lines the model actually emitted (pre-validation) */
  rawParsedCount: number;
  /**
   * true only when every index 1..N is present exactly once with nonempty text.
   * Duplicate, skipped, reordered, or empty entries all make this false.
   */
  complete: boolean;
  missingIndices: number[];
  duplicateIndices: number[];
}

/**
 * Parse the numbered-list text that the OpenAI model returns.
 *
 * Only lines anchored at column 0 matching `^N. text` are accepted.
 * Indented lines (e.g. continuations inside a multiline event description)
 * are ignored to prevent index-shifting bugs.
 *
 * @param content   Raw model response text
 * @param expectedCount  Number of items we asked the model to translate (N)
 */
export function parseTranslationResponse(
  content: string,
  expectedCount: number,
): ParsedTranslationResponse {
  const byIndex = new Map<number, string>();
  const seenIndices = new Set<number>();
  const duplicateIndices: number[] = [];

  for (const line of content.split("\n")) {
    // Match only lines that start at column 0 with "N. text"
    // Require at least one non-whitespace character after the number+dot
    const m = line.match(/^(\d+)\.\s+(\S[\s\S]*)/);
    if (!m) continue;

    const idx = parseInt(m[1], 10);
    const text = m[2].trim();

    // Only accept indices within the expected range
    if (idx < 1 || idx > expectedCount) continue;

    if (seenIndices.has(idx)) {
      if (!duplicateIndices.includes(idx)) duplicateIndices.push(idx);
      continue; // keep first occurrence; flag as duplicate
    }

    seenIndices.add(idx);
    if (text.length > 0) {
      byIndex.set(idx, text);
    }
  }

  const rawParsedCount = seenIndices.size;

  const missingIndices: number[] = [];
  for (let i = 1; i <= expectedCount; i++) {
    if (!byIndex.has(i)) missingIndices.push(i);
  }

  // complete = every index 1..N present exactly once with nonempty content, no duplicates
  const complete =
    duplicateIndices.length === 0 &&
    missingIndices.length === 0 &&
    byIndex.size === expectedCount;

  return { byIndex, rawParsedCount, complete, missingIndices, duplicateIndices };
}

// ---------------------------------------------------------------------------
// Core OpenAI translation — sends ONE numbered batch, returns same-length array
// ---------------------------------------------------------------------------

interface TranslationResult {
  translations: string[];
  /** true only when the model returned a complete, valid numbered response for every item */
  complete: boolean;
  rawParsedCount: number;
}

async function translateWithOpenAI(texts: string[], targetLang: string): Promise<TranslationResult> {
  const langName = targetLang === "ja" ? "Japanese" : "English";
  const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-5-nano",
    messages: [
      {
        role: "system",
        content: `You are a translator. Translate the numbered event titles/descriptions to ${langName}. Return ONLY the numbered translations in the same format, one per line starting at column 0. Preserve event names, venue names, and proper nouns where appropriate.`,
      },
      { role: "user", content: numbered },
    ],
  });

  const content = completion.choices?.[0]?.message?.content ?? "";
  const parsed = parseTranslationResponse(content, texts.length);

  // Build output array — fall back to source text for any missing entries
  const translations = texts.map((t, i) => parsed.byIndex.get(i + 1) ?? t);

  return { translations, complete: parsed.complete, rawParsedCount: parsed.rawParsedCount };
}

/**
 * POST /api/translate
 * Translates an array of texts using OpenAI gpt-5-nano (fastest/cheapest).
 * Results are cached in the DB so repeat requests are instant.
 * Body: { texts: string[], targetLang?: "ja" | "en" }
 * Response: { translations: string[], translated: boolean }
 *   translated: false when the model failed, returned an incomplete/malformed response,
 *               or the API key is unavailable.
 */
router.post("/translate", async (req, res) => {
  const { texts, targetLang = "ja" } = req.body ?? {};

  if (!Array.isArray(texts) || texts.length === 0) {
    res.status(400).json({ error: "texts array required" });
    return;
  }

  // Preserve the full positional array — do NOT filter(Boolean).
  // Callers submit parallel title+description arrays mapped by index; removing empty
  // strings here would shift every subsequent position and silently map the wrong
  // translation onto the wrong event card.
  const batch = (texts as string[]).slice(0, 60);

  // Only translate nonempty entries; empty strings are returned as-is in their positions.
  const nonempty = batch.filter(Boolean);

  if (!process.env["AI_INTEGRATIONS_OPENAI_API_KEY"]) {
    res.json({ translations: batch, translated: false });
    return;
  }

  try {
    // 1. Check DB cache for all nonempty texts in parallel
    const cached = await dbCacheGetMany(nonempty, targetLang);
    const uncached = nonempty.filter(t => !cached.has(t));

    logger.info({ total: batch.length, nonempty: nonempty.length, cached: cached.size, uncached: uncached.length }, "Translation request");

    // 2. Translate only uncached nonempty texts via OpenAI
    let modelTranslationComplete = true; // vacuously true when everything was cached
    if (uncached.length > 0) {
      const { translations: newTranslations, complete, rawParsedCount } = await translateWithOpenAI(uncached, targetLang);
      modelTranslationComplete = complete;

      if (complete) {
        // 3. Store new translations in DB cache
        // Skip entries identical to source — proper nouns are legitimately unchanged
        const toStore = uncached
          .map((t, i) => ({ source: t, translated: newTranslations[i] ?? t }))
          .filter(p => p.translated && p.translated !== p.source);

        await dbCacheSetMany(toStore, targetLang);

        // 4. Merge into cached map
        for (const { source, translated } of toStore) {
          cached.set(source, translated);
        }
      } else {
        // Incomplete/malformed response — do NOT cache; log with pre-padding count
        logger.error(
          {
            requested: uncached.length,
            rawParsedCount,
          },
          "Translation incomplete — model response invalid or truncated; returning originals",
        );
      }
    }

    // 5. Return in original order, preserving empty strings at their positions
    const translations = batch.map(t => (t ? (cached.get(t) ?? t) : t));
    res.json({ translations, translated: modelTranslationComplete });
  } catch (err) {
    logger.error({ err }, "Translation failed — model error, returning originals");
    res.json({ translations: batch, translated: false });
  }
});

export default router;
