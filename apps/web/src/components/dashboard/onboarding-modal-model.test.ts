import { describe, expect, it } from "vitest";
import {
  EMPTY_ONBOARDING_MEMORY,
  getOnboardingSourceMisconception,
  getOnboardingStorageKey,
  parseOnboardingMemory,
} from "@/components/dashboard/onboarding-modal-model";

describe("onboarding modal model", () => {
  it("builds a workspace-scoped storage key", () => {
    expect(getOnboardingStorageKey("workspace-123")).toBe(
      "avenire:onboarding-memory:v2:workspace-123"
    );
  });

  it("parses only valid generated-card payloads and caps the remembered mindset", () => {
    const payload = JSON.stringify({
      generatedCards: [
        ...Array.from({ length: 13 }, (_, index) => ({
          backMarkdown: `Back ${index}`,
          frontMarkdown: `Front ${index}`,
          tags: [`Tag ${index}`],
        })),
        {
          backMarkdown: 42,
          frontMarkdown: "Broken",
          tags: ["ignored"],
        },
      ],
      generatedMindsetTitle: "Mindset",
      generatedSetId: "set-1",
      uploadAt: "2026-05-13T00:00:00.000Z",
      uploadFileName: "notes.pdf",
    });

    const memory = parseOnboardingMemory(payload);

    expect(memory.generatedCards).toHaveLength(12);
    expect(memory.generatedCards[0]?.frontMarkdown).toBe("Front 0");
    expect(memory.generatedMindsetTitle).toBe("Mindset");
    expect(memory.generatedSetId).toBe("set-1");
    expect(memory.uploadFileName).toBe("notes.pdf");
  });

  it("falls back cleanly for invalid memory blobs and missing misconceptions", () => {
    expect(parseOnboardingMemory("{bad json")).toEqual(EMPTY_ONBOARDING_MEMORY);

    expect(
      getOnboardingSourceMisconception(
        [],
        [{ subject: "Physics", topic: "Electric flux" }]
      )
    ).toEqual({
      concept: "Electric flux",
      reason: "Physics / Electric flux",
      subject: "Physics",
      topic: "Electric flux",
    });
  });
});
