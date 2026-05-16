import { describe, expect, it } from "vitest";
import { normalizeFlashcardSetId } from "@/lib/flashcard-set-id";

describe("flashcard set id", () => {
  it("accepts trimmed UUID set ids and rejects non-UUID deep links", () => {
    expect(
      normalizeFlashcardSetId("  c729fdf9-945d-46bf-927b-a86b8ee90a07  ")
    ).toBe("c729fdf9-945d-46bf-927b-a86b8ee90a07");

    expect(normalizeFlashcardSetId("intro-to-computers")).toBeNull();
    expect(normalizeFlashcardSetId("")).toBeNull();
  });
});
