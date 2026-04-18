import { describe, expect, it } from "vitest";
import { normalizeFlashcardTaxonomy } from "./flashcard-data";
import {
  canonicalizeLearningTaxonomy,
  canonicalizeSubjectLabel,
} from "./learning-taxonomy";

describe("learning-taxonomy", () => {
  it("normalizes aliased subject labels", () => {
    expect(canonicalizeSubjectLabel("computer_science")).toBe(
      "Computer Science"
    );
    expect(canonicalizeSubjectLabel("maths")).toBe("Mathematics");
  });

  it("reclassifies amino-acid content away from physics", () => {
    expect(
      canonicalizeLearningTaxonomy({
        concept: "essential amino acids biomolecules NCERT",
        subject: "physics",
        topic: "essential amino acids biomolecules NCERT",
      })
    ).toEqual({
      concept: "Essential amino acids",
      subject: "Biology",
      topic: "Biomolecules",
    });
  });

  it("reclassifies thermochemistry content away from physics", () => {
    expect(
      canonicalizeLearningTaxonomy({
        concept: "Thermochemistry: ΔG, ΔS, ΔH Relationships",
        subject: "physics",
        topic: "Thermochemistry: ΔG, ΔS, ΔH Relationships",
      })
    ).toEqual({
      concept: "Thermochemistry",
      subject: "Chemistry",
      topic: "Thermochemistry",
    });
  });

  it("canonicalizes flashcard taxonomy on ingest", () => {
    expect(
      normalizeFlashcardTaxonomy({
        concept: "essential amino acids biomolecules NCERT",
        subject: "physics",
        topic: "essential amino acids biomolecules NCERT",
      })
    ).toEqual({
      concept: "Essential amino acids",
      subject: "Biology",
      topic: "Biomolecules",
    });
  });
});
