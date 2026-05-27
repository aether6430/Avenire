import { describe, expect, it } from "vitest";
import {
  canonicalizeLearningTaxonomy,
  canonicalizeSubjectLabel,
  normalizeFlashcardTaxonomy,
} from "./learning-taxonomy";

describe("learning-taxonomy", () => {
  it("mechanically normalizes subject labels without semantic aliases", () => {
    expect(canonicalizeSubjectLabel("computer_science")).toBe(
      "Computer Science"
    );
    expect(canonicalizeSubjectLabel("maths")).toBe("Maths");
  });

  it("does not reclassify content with hard-coded keyword rules", () => {
    expect(
      canonicalizeLearningTaxonomy({
        concept: "essential amino acids biomolecules NCERT",
        subject: "physics",
        topic: "essential amino acids biomolecules NCERT",
      })
    ).toEqual({
      concept: "essential amino acids biomolecules NCERT",
      subject: "Physics",
      topic: "Essential Amino Acids Biomolecules Ncert",
    });
  });

  it("preserves AI-provided taxonomy labels after cleanup", () => {
    expect(
      canonicalizeLearningTaxonomy({
        concept: "Thermochemistry: ΔG, ΔS, ΔH Relationships",
        subject: "chemistry",
        topic: "thermochemistry",
      })
    ).toEqual({
      concept: "Thermochemistry: ΔG, ΔS, ΔH Relationships",
      subject: "Chemistry",
      topic: "Thermochemistry",
    });
  });

  it("does not override stale chemistry context from rotational keywords", () => {
    expect(
      canonicalizeLearningTaxonomy({
        concept: "relative angular acceleration from constant ω",
        subject: "Chemistry",
        text: [
          "relative angular acceleration from constant ω",
          "constant angular velocity implies zero angular acceleration in an inertial frame",
          "rotating frame derivative formula",
        ].join("\n"),
        topic: "Acids and Bases",
      })
    ).toEqual({
      concept: "relative angular acceleration from constant ω",
      subject: "Chemistry",
      topic: "Acids And Bases",
    });
  });

  it("normalizes flashcard taxonomy mechanically on ingest", () => {
    expect(
      normalizeFlashcardTaxonomy({
        concept: "essential amino acids biomolecules NCERT",
        subject: "biology",
        topic: "biomolecules",
      })
    ).toEqual({
      subject: "Biology",
      topic: "Biomolecules",
      concept: "essential amino acids biomolecules NCERT",
    });
  });
});
