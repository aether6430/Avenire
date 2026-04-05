import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  languageModel: vi.fn(() => "apollo-tiny-model"),
}));

vi.mock("@avenire/ai", () => ({
  apollo: {
    languageModel: mocks.languageModel,
  },
  generateText: mocks.generateText,
}));

import { expandQuery } from "./query-expansion";

describe("expandQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for blank queries without calling the model", async () => {
    await expect(expandQuery("   ")).resolves.toBeNull();
    expect(mocks.generateText).not.toHaveBeenCalled();
  });

  it("normalizes fenced and listed model output into a plain expansion", async () => {
    mocks.generateText.mockResolvedValue({
      text: "```text\n1.   diffusion across a semipermeable membrane   \n```",
    });

    await expect(expandQuery("osmosis")).resolves.toBe(
      "diffusion across a semipermeable membrane"
    );
    expect(mocks.languageModel).toHaveBeenCalledWith("apollo-tiny");
    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "osmosis",
        temperature: 0.2,
        maxOutputTokens: 64,
      })
    );
  });

  it("returns null when the model produces the same query after normalization", async () => {
    mocks.generateText.mockResolvedValue({
      text: "```json\n  OSMOSIS \n```",
    });

    await expect(expandQuery("osmosis")).resolves.toBeNull();
  });
});
