import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RetrievalDecisionTelemetry } from "./retrieve";

const mocks = vi.hoisted(() => ({
  meter: vi.fn(),
}));

vi.mock("@avenire/observability", () => ({
  meter: mocks.meter,
}));

import {
  observeRetrievalProviderCall,
  recordRetrievalCacheTelemetry,
  recordRetrievalQualityTelemetry,
} from "./telemetry";

function createDecision(): RetrievalDecisionTelemetry {
  return {
    ambiguityReasons: ["weak_anchor"],
    candidateCount: 8,
    confidenceScore: 0.84,
    contextTokenBudget: 2400,
    contextTokenCount: 600,
    contextTruncated: false,
    corpus: { chunks: 20, embeddings: 20, resources: 3 },
    expansionUsed: true,
    fusionCandidateCount: 10,
    hydeCandidateCount: 2,
    hydeFallbackUsed: false,
    hydeUsed: true,
    intent: { audio: false, document: true, visual: false },
    latencyMs: 125,
    learnerBoostedCandidateCount: 0,
    lexicalCandidateCount: 3,
    queryCount: 2,
    queryShape: {
      charCount: 28,
      decomposedQueryCount: 1,
      hasCodeIdentifier: false,
      hasQuestionMark: true,
      hasQuotedPhrase: false,
      provider: null,
      searchQueryCount: 2,
      sourceType: "pdf",
      tokenCount: 5,
    },
    rerankCandidateCount: 6,
    rerankFallbackUsed: false,
    rerankUsed: true,
    resultCount: 3,
    resultSourceTypeMix: { pdf: 3 },
    sourceTypeBreakdown: { pdf: 8 },
    topRerankScore: 0.92,
    topResultSourceType: "pdf",
    userId: null,
    workspaceId: null,
  };
}

describe("retrieval operational telemetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records cache metrics with bounded dimensions", () => {
    recordRetrievalCacheTelemetry({
      cacheLookupMs: 4,
      mode: "auto",
      origin: "chat",
      outcome: "hit",
      path: "fast",
      sourceType: "pdf",
    });

    expect(mocks.meter).toHaveBeenCalledWith({
      eventName: "retrieval.cache.lookup",
      payload: {
        cacheLookupMs: 4,
        mode: "auto",
        origin: "chat",
        outcome: "hit",
        path: "fast",
        sourceType: "pdf",
      },
    });
  });

  it("records explicit recall and citation-quality proxies", () => {
    recordRetrievalQualityTelemetry({
      decision: createDecision(),
      path: "slow",
    });

    expect(mocks.meter).toHaveBeenCalledWith({
      eventName: "retrieval.quality.proxy",
      payload: expect.objectContaining({
        candidateCount: 8,
        citationQualityProxy: 0.92,
        confidenceProxy: 0.84,
        path: "slow",
        recallProxy: 0.5,
        resultCount: 3,
        sourceType: "pdf",
      }),
    });
  });

  it("records provider call count, latency, operation, and success", async () => {
    await expect(
      observeRetrievalProviderCall({
        operation: "embedding",
        provider: "cohere",
        run: async () => "embedding-result",
      })
    ).resolves.toBe("embedding-result");

    expect(mocks.meter).toHaveBeenCalledWith({
      eventName: "retrieval.provider.call",
      payload: expect.objectContaining({
        callCount: 1,
        latencyMs: expect.any(Number),
        operation: "embedding",
        outcome: "success",
        provider: "cohere",
      }),
    });
  });

  it("records failed and cancelled provider outcomes before rethrowing", async () => {
    await expect(
      observeRetrievalProviderCall({
        operation: "rerank",
        provider: "apollo",
        run: async () => {
          throw new Error("provider failed");
        },
      })
    ).rejects.toThrow("provider failed");
    await expect(
      observeRetrievalProviderCall({
        operation: "hyde",
        provider: "apollo",
        run: async () => {
          throw new Error("request aborted");
        },
      })
    ).rejects.toThrow("request aborted");

    expect(mocks.meter).toHaveBeenNthCalledWith(1, {
      eventName: "retrieval.provider.call",
      payload: expect.objectContaining({ outcome: "error" }),
    });
    expect(mocks.meter).toHaveBeenNthCalledWith(2, {
      eventName: "retrieval.provider.call",
      payload: expect.objectContaining({ outcome: "cancelled" }),
    });
  });
});
