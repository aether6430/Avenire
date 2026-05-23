import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("flashcard-data ordinal allocation", () => {
  it("allocates new card ordinals across archived cards", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "flashcard-data.ts"),
      "utf8"
    );
    const start = source.indexOf(
      "export async function createFlashcardCardForUser"
    );
    const end = source.indexOf("const now = new Date();", start);
    const ordinalLookup = source.slice(start, end);

    expect(ordinalLookup).toContain(
      ".where(eq(flashcardCard.setId, input.setId))"
    );
    expect(ordinalLookup).not.toContain("isNull(flashcardCard.archivedAt)");
  });

  it("keeps flashcard taxonomy normalization delegated to the shared helper module", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "flashcard-data.ts"),
      "utf8"
    );

    expect(source).toContain('from "./flashcard-taxonomy"');
    expect(source).toContain(
      'export { normalizeFlashcardTaxonomy } from "./flashcard-taxonomy";'
    );
    expect(source).not.toContain("function normalizeFlashcardTaxonomy(");
    expect(source).not.toContain("function assertFlashcardTaxonomy(");
  });
});
