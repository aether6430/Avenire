import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildFlashcardDrillQuery,
  getFlashcardEnrollmentLabel,
  readFlashcardTaxonomyField,
} from "@/components/flashcards/flashcard-set-detail-model";

const setDetailModelSource = readFileSync(
  resolve(import.meta.dirname, "./flashcard-set-detail-model.ts"),
  "utf8"
);

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

  it("keeps detail model helpers pure and free of fetch/runtime side effects", () => {
    expect(setDetailModelSource).toContain("export const RATING_STYLES");
    expect(setDetailModelSource).toContain(
      "export function buildFlashcardDrillQuery"
    );
    expect(setDetailModelSource).toContain(
      "export function getFlashcardEnrollmentLabel"
    );
    expect(setDetailModelSource).not.toContain("fetch(");
    expect(setDetailModelSource).not.toContain("useState(");
    expect(setDetailModelSource).not.toContain("window.");
  });
});
