import { describe, expect, it } from "vitest";
import { APOLLO_PROMPT, type PromptMemoryBlock } from "./chat";

describe("APOLLO_PROMPT", () => {
  it("uses server-provided misconception memory without forcing an early tool call", () => {
    const memory: PromptMemoryBlock[] = [
      {
        content:
          "Active learning misconceptions:\n1. Momentum [Physics / Collisions] - Thinks momentum disappears",
        freshness: "historical",
        kind: "misconception",
        scope: {
          subject: "Physics",
          topic: "Collisions",
        },
      },
    ];

    const prompt = APOLLO_PROMPT("Ada", memory);

    expect(prompt).toContain("Trusted server memory blocks:");
    expect(prompt).toContain("Active learning misconceptions:");
    expect(prompt).toContain(
      "Do not call list_misconceptions by default just to inspect memory before answering."
    );
    expect(prompt).not.toContain(
      "call list_misconceptions near the beginning"
    );
  });
});
