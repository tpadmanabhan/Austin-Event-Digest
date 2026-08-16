import { describe, it, expect } from "vitest";
import { parseTranslationResponse } from "./translate.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResponse(items: Array<string | null>, indent = false): string {
  return items
    .map((text, i) => {
      if (text === null) return ""; // simulate a missing line
      const prefix = indent ? "  " : "";
      return `${prefix}${i + 1}. ${text}`;
    })
    .filter(Boolean)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe("parseTranslationResponse — happy path", () => {
  it("accepts a clean N-line response", () => {
    const content = "1. Tokyo Tower\n2. Shinjuku Event\n3. Harajuku Market";
    const result = parseTranslationResponse(content, 3);
    expect(result.complete).toBe(true);
    expect(result.byIndex.get(1)).toBe("Tokyo Tower");
    expect(result.byIndex.get(2)).toBe("Shinjuku Event");
    expect(result.byIndex.get(3)).toBe("Harajuku Market");
    expect(result.missingIndices).toEqual([]);
    expect(result.duplicateIndices).toEqual([]);
    expect(result.rawParsedCount).toBe(3);
  });

  it("accepts proper nouns that are identical to source (legitimately unchanged)", () => {
    const content = "1. Toyota\n2. Sony\n3. Panasonic";
    const result = parseTranslationResponse(content, 3);
    expect(result.complete).toBe(true);
    expect(result.byIndex.size).toBe(3);
  });

  it("accepts a single-item batch", () => {
    const content = "1. イベント";
    const result = parseTranslationResponse(content, 1);
    expect(result.complete).toBe(true);
    expect(result.byIndex.get(1)).toBe("イベント");
  });
});

// ---------------------------------------------------------------------------
// Truncated responses
// ---------------------------------------------------------------------------

describe("parseTranslationResponse — truncated responses", () => {
  it("marks incomplete when model returns fewer lines than requested", () => {
    const content = "1. First item\n2. Second item";
    const result = parseTranslationResponse(content, 3);
    expect(result.complete).toBe(false);
    expect(result.missingIndices).toContain(3);
    expect(result.rawParsedCount).toBe(2);
  });

  it("marks incomplete when model returns nothing", () => {
    const result = parseTranslationResponse("", 3);
    expect(result.complete).toBe(false);
    expect(result.missingIndices).toEqual([1, 2, 3]);
    expect(result.rawParsedCount).toBe(0);
  });

  it("marks incomplete on a partial single-item batch", () => {
    const result = parseTranslationResponse("", 1);
    expect(result.complete).toBe(false);
    expect(result.missingIndices).toEqual([1]);
  });
});

// ---------------------------------------------------------------------------
// Duplicate indices
// ---------------------------------------------------------------------------

describe("parseTranslationResponse — duplicate indices", () => {
  it("marks incomplete when a numbered index appears twice", () => {
    const content = "1. First\n2. Second\n2. Duplicate second\n3. Third";
    const result = parseTranslationResponse(content, 3);
    expect(result.complete).toBe(false);
    expect(result.duplicateIndices).toContain(2);
  });

  it("keeps the first occurrence of a duplicated index", () => {
    const content = "1. First\n2. KeepMe\n2. DropMe\n3. Third";
    const result = parseTranslationResponse(content, 3);
    expect(result.byIndex.get(2)).toBe("KeepMe");
  });
});

// ---------------------------------------------------------------------------
// Skipped / reordered indices
// ---------------------------------------------------------------------------

describe("parseTranslationResponse — skipped and reordered", () => {
  it("marks incomplete when an index is skipped", () => {
    const content = "1. First\n3. Third"; // index 2 missing
    const result = parseTranslationResponse(content, 3);
    expect(result.complete).toBe(false);
    expect(result.missingIndices).toContain(2);
  });

  it("still succeeds when items are reordered (all indices present)", () => {
    const content = "3. Third\n1. First\n2. Second";
    const result = parseTranslationResponse(content, 3);
    expect(result.complete).toBe(true);
    expect(result.byIndex.get(1)).toBe("First");
    expect(result.byIndex.get(2)).toBe("Second");
    expect(result.byIndex.get(3)).toBe("Third");
  });
});

// ---------------------------------------------------------------------------
// Empty numbered entries
// ---------------------------------------------------------------------------

describe("parseTranslationResponse — empty entries", () => {
  it("marks incomplete when a numbered line has no content after the dot", () => {
    // "2." with only whitespace — should not be counted as a valid entry
    const content = "1. First\n2.   \n3. Third";
    const result = parseTranslationResponse(content, 3);
    expect(result.complete).toBe(false);
    expect(result.missingIndices).toContain(2);
  });

  it("marks incomplete for a bare '2.' line", () => {
    const content = "1. First\n2.\n3. Third";
    const result = parseTranslationResponse(content, 3);
    expect(result.complete).toBe(false);
    expect(result.missingIndices).toContain(2);
  });
});

// ---------------------------------------------------------------------------
// Indented / multiline numbered content
// ---------------------------------------------------------------------------

describe("parseTranslationResponse — indented numbered content", () => {
  it("ignores indented numbered lines so they don't shift mappings", () => {
    // Simulate a description that contains its own numbered list (indented)
    const content = [
      "1. Main Event Title",
      "   This event features:",
      "   1. Activity one",
      "   2. Activity two",
      "2. Second Event",
      "3. Third Event",
    ].join("\n");

    const result = parseTranslationResponse(content, 3);
    expect(result.complete).toBe(true);
    expect(result.byIndex.get(1)).toBe("Main Event Title");
    expect(result.byIndex.get(2)).toBe("Second Event");
    expect(result.byIndex.get(3)).toBe("Third Event");
  });

  it("ignores out-of-range indices that look like numbered content", () => {
    // Model echoes a preamble "0. Note:" or adds a "4." when only 3 were asked
    const content = "0. Translator note\n1. First\n2. Second\n3. Third\n4. Extra";
    const result = parseTranslationResponse(content, 3);
    expect(result.complete).toBe(true);
    expect(result.byIndex.has(0)).toBe(false);
    expect(result.byIndex.has(4)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Positional correctness for title+description batches with empty descriptions
// ---------------------------------------------------------------------------

describe("parseTranslationResponse — positional correctness with empty strings", () => {
  it("counts only nonempty items; caller must exclude empties before submitting", () => {
    // When the caller strips empty descriptions before submission and submits only
    // nonempty strings, parseTranslationResponse must map them 1:1 correctly.
    // Simulate: titles=[A, B], descs=[descA, ""] → caller submits [A, B, descA] (3 items)
    const content = "1. 日本語A\n2. 日本語B\n3. 日本語descA";
    const result = parseTranslationResponse(content, 3);
    expect(result.complete).toBe(true);
    expect(result.byIndex.get(1)).toBe("日本語A");
    expect(result.byIndex.get(2)).toBe("日本語B");
    expect(result.byIndex.get(3)).toBe("日本語descA");
  });

  it("is marked incomplete when fewer items are returned than submitted", () => {
    // If a caller accidentally includes an empty string in the batch and the model
    // skips it, the response is shorter → incomplete → translated:false
    const content = "1. 日本語A\n2. 日本語B";
    const result = parseTranslationResponse(content, 3);
    expect(result.complete).toBe(false);
    expect(result.missingIndices).toContain(3);
  });
});
