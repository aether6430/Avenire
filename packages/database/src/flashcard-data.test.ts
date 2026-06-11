import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(currentDir, "flashcard-data.ts"), "utf8");

function createCardSource() {
  const start = source.indexOf(
    "export async function createFlashcardCardForUser"
  );
  const end = source.indexOf(
    "export async function updateFlashcardCardForUser",
    start
  );

  if (start < 0 || end < 0) {
    throw new Error("Could not locate flashcard card creation source");
  }

  return source.slice(start, end);
}

describe("createFlashcardCardForUser", () => {
  it("serializes ordinal allocation and includes archived ordinals", () => {
    const createSource = createCardSource();

    expect(createSource).toContain("db.transaction(async (tx)");
    expect(createSource).toContain("pg_advisory_xact_lock");
    expect(createSource).toContain("flashcard-card-ordinal:");
    expect(createSource).toContain(
      ".where(eq(flashcardCard.setId, input.setId))"
    );
    expect(createSource).not.toContain("isNull(flashcardCard.archivedAt)");
    expect(createSource).toContain("await tx\n      .update(flashcardSet)");
  });
});
