import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  apollo: { languageModel: vi.fn(() => "apollo-model") },
}));

vi.mock("@avenire/ai", () => ({
  APOLLO_INGESTION_COHERE_EMBED_MODEL: "cohere-embed-model",
  APOLLO_INGESTION_GROQ_TRANSCRIPTION_MODEL: "groq-transcription-model",
  APOLLO_INGESTION_MISTRAL_IMAGE_DESCRIPTION_MODEL:
    "mistral-image-description-model",
  APOLLO_INGESTION_MISTRAL_OCR_MODEL: "mistral-ocr-model",
  apollo: mocks.apollo,
  generateText: mocks.generateText,
}));

import { expandQuery, generateHydeDocument } from "./query-expansion";

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
    expect(mocks.apollo.languageModel).toHaveBeenCalledWith("apollo-tiny");
    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "osmosis",
        temperature: 0.2,
        maxOutputTokens: 256,
      })
    );
  });

  it("forwards cancellation to query enhancement model calls", async () => {
    mocks.generateText.mockResolvedValue({ text: "expanded osmosis query" });
    const abortController = new AbortController();

    await expandQuery("osmosis", {
      abortSignal: abortController.signal,
    });

    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({ abortSignal: abortController.signal })
    );
  });

  it("keeps only the first usable expansion line from multi-line numbered output", async () => {
    mocks.generateText.mockResolvedValue({
      text: "1. diffusion across a semipermeable membrane\n2. osmosis in plant cells",
    });

    await expect(expandQuery("osmosis")).resolves.toBe(
      "diffusion across a semipermeable membrane"
    );
  });

  it("skips empty bullet-only lines and keeps the first usable expansion line", async () => {
    mocks.generateText.mockResolvedValue({
      text: "1.\nDiffusion across a semipermeable membrane",
    });

    await expect(expandQuery("osmosis")).resolves.toBe(
      "Diffusion across a semipermeable membrane"
    );
  });

  it("returns null when the model produces the same query after normalization", async () => {
    mocks.generateText.mockResolvedValue({
      text: "```json\n  OSMOSIS \n```",
    });

    await expect(expandQuery("osmosis")).resolves.toBeNull();
  });

  it("generates a normalized HyDE source excerpt", async () => {
    mocks.generateText.mockResolvedValue({
      text: "```text\nOsmosis is the movement of water across a semipermeable membrane along a water potential gradient.\n```",
    });

    await expect(generateHydeDocument("osmosis")).resolves.toBe(
      "Osmosis is the movement of water across a semipermeable membrane along a water potential gradient."
    );
    expect(mocks.apollo.languageModel).toHaveBeenCalledWith("apollo-tiny");
    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "osmosis",
        temperature: 0.2,
        maxOutputTokens: expect.any(Number),
      })
    );
  });

  it("returns null when HyDE generation matches the original query", async () => {
    mocks.generateText.mockResolvedValue({
      text: "osmosis",
    });

    await expect(generateHydeDocument("osmosis")).resolves.toBeNull();
  });
});
