import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearMisconceptionSignalEmbeddingCache,
  cosineSimilarity,
  detectMisconceptionSignals,
  type MisconceptionSignalRecord,
} from "./misconception-signals";

const baseMisconception: MisconceptionSignalRecord = {
  confidence: 0.82,
  concept: "Newton's third law",
  id: "misconception-1",
  reason:
    "The learner thinks the heavier object applies a larger force in an interaction.",
  subject: "Physics",
  topic: "Forces",
  updatedAt: "2026-05-13T00:00:00.000Z",
};

describe("misconception signals", () => {
  beforeEach(() => {
    clearMisconceptionSignalEmbeddingCache();
    vi.restoreAllMocks();
  });

  it("computes cosine similarity and rejects incompatible vectors", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([1], [1, 0])).toBe(0);
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it("injects only cosine-filtered and classifier-approved misconceptions", async () => {
    const classifier = vi.fn(async ({ ranked }) => ({
      matched: true,
      reason: `matched ${ranked[0]?.misconception.concept}`,
    }));
    const embedTexts = vi.fn(async ({ inputType, texts }) => {
      if (inputType === "search_query") {
        return [[1, 0, 0]];
      }

      expect(texts).toHaveLength(3);
      return [
        [0.9, 0.1, 0],
        [0.1, 0.9, 0],
        [0.7, 0.3, 0],
      ];
    });

    const result = await detectMisconceptionSignals({
      latestUserText:
        "I think the heavier cart pushes harder than the lighter cart.",
      misconceptions: [
        baseMisconception,
        {
          ...baseMisconception,
          concept: "Photosynthesis",
          id: "misconception-2",
          reason: "Plants get most of their mass from soil.",
        },
        {
          ...baseMisconception,
          concept: "Equal and opposite forces",
          id: "misconception-3",
          reason: "Action and reaction forces cancel because they are equal.",
        },
      ],
      options: {
        classifier,
        embedTexts,
        now: () => 1000,
        providerTimeoutMs: null,
      },
      subject: "Physics",
      topic: "Forces",
    });

    expect(result?.matched).toBe(true);
    expect(result?.candidates.map((entry) => entry.misconception.id)).toEqual([
      "misconception-1",
      "misconception-3",
    ]);
    expect(result?.interventionBlock?.content).toContain("Newton's third law");
    expect(result?.interventionBlock?.content).toContain(
      "Equal and opposite forces"
    );
    expect(result?.interventionBlock?.content).not.toContain("Photosynthesis");
    expect(classifier).toHaveBeenCalledTimes(1);
  });

  it("does not call the classifier when cosine prefilter misses", async () => {
    const classifier = vi.fn(async () => ({
      matched: true,
      reason: "should not run",
    }));
    const embedTexts = vi.fn(async ({ inputType }) =>
      inputType === "search_query" ? [[1, 0]] : [[0, 1]]
    );

    const result = await detectMisconceptionSignals({
      latestUserText: "How does chlorophyll work?",
      misconceptions: [baseMisconception],
      options: {
        classifier,
        embedTexts,
        providerTimeoutMs: null,
      },
      subject: "Physics",
      topic: "Forces",
    });

    expect(result).toEqual({
      candidates: [],
      interventionBlock: null,
      matched: false,
    });
    expect(classifier).not.toHaveBeenCalled();
  });

  it("caches misconception document embeddings across detections", async () => {
    const classifier = vi.fn(async () => ({
      matched: true,
      reason: "same misconception",
    }));
    const embedTexts = vi.fn(async ({ inputType }) =>
      inputType === "search_query" ? [[1, 0]] : [[1, 0]]
    );

    const options = {
      classifier,
      embedTexts,
      now: () => 1000,
      providerTimeoutMs: null,
    };

    await detectMisconceptionSignals({
      latestUserText: "The heavier cart pushes harder.",
      misconceptions: [baseMisconception],
      options,
      subject: "Physics",
      topic: "Forces",
    });
    await detectMisconceptionSignals({
      latestUserText: "The heavy object must push with more force.",
      misconceptions: [baseMisconception],
      options,
      subject: "Physics",
      topic: "Forces",
    });

    const documentEmbeddingCalls = embedTexts.mock.calls.filter(
      ([input]) => input.inputType === "search_document"
    );
    const queryEmbeddingCalls = embedTexts.mock.calls.filter(
      ([input]) => input.inputType === "search_query"
    );
    expect(documentEmbeddingCalls).toHaveLength(1);
    expect(queryEmbeddingCalls).toHaveLength(2);
  });

  it("returns candidates without prompt injection when classifier rejects", async () => {
    const classifier = vi.fn(async () => ({
      matched: false,
      reason: "related but not the same misconception",
    }));
    const embedTexts = vi.fn(async ({ inputType }) =>
      inputType === "search_query" ? [[1, 0]] : [[1, 0]]
    );

    const result = await detectMisconceptionSignals({
      latestUserText: "What happens when two carts collide?",
      misconceptions: [baseMisconception],
      options: {
        classifier,
        embedTexts,
        providerTimeoutMs: null,
      },
      subject: "Physics",
      topic: "Forces",
    });

    expect(result?.matched).toBe(false);
    expect(result?.candidates).toHaveLength(1);
    expect(result?.interventionBlock).toBeNull();
  });
});
