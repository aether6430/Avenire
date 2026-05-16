import { describe, expect, it } from "vitest";
import {
  buildFlashcardDrillQuery,
  getFlashcardEnrollmentLabel,
  readFlashcardTaxonomyField,
} from "@/components/flashcards/flashcard-set-detail-model";

describe("flashcard set detail model", () => {
  it("serializes drill filters into repeatable query params", () => {
    const query = buildFlashcardDrillQuery([
      {
        concept: "Entropy",
        subject: "Chemistry",
        topic: "Thermodynamics",
      },
      {
        concept: "Enthalpy",
        subject: "Chemistry",
        topic: "Thermodynamics",
      },
    ]);

    const params = new URLSearchParams(query);
    expect(params.getAll("drill")).toHaveLength(2);
    expect(params.getAll("drill")[0]).toContain('"Entropy"');
    expect(params.getAll("drill")[1]).toContain('"Enthalpy"');
  });

  it("derives enrollment labels and safely reads taxonomy fields", () => {
    expect(getFlashcardEnrollmentLabel("active")).toBe("Study active");
    expect(getFlashcardEnrollmentLabel("paused")).toBe("Paused");
    expect(getFlashcardEnrollmentLabel(null)).toBe("Not enrolled");

    expect(
      readFlashcardTaxonomyField(
        { concept: "Entropy", subject: "Chemistry", topic: "Thermodynamics" },
        "concept"
      )
    ).toBe("Entropy");
    expect(readFlashcardTaxonomyField({ concept: 42 }, "concept")).toBe("");
  });
});
