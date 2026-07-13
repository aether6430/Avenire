import { expect, it, vi } from "vitest";

const meter = vi.hoisted(() => vi.fn());
vi.mock("@avenire/observability", () => ({ meter }));

import {
  observeRetrievalProviderCall,
  recordRetrievalQualityTelemetry,
} from "./telemetry";

it("emits quality and failed provider telemetry", async () => {
  recordRetrievalQualityTelemetry({
    decision: {
      ambiguityReasons: ["weak_anchor"],
      candidateCount: 8,
      confidenceScore: 0.84,
      contextTruncated: false,
      queryShape: { sourceType: "pdf" },
      rerankCandidateCount: 6,
      rerankFallbackUsed: false,
      resultCount: 3,
      topRerankScore: 0.92,
    },
    path: "slow",
  });
  for (const [message, outcome] of [
    ["provider failed", "error"],
    ["request aborted", "cancelled"],
  ] as const) {
    await expect(
      observeRetrievalProviderCall({
        operation: "rerank",
        provider: "apollo",
        run: async () => {
          throw new Error(message);
        },
      })
    ).rejects.toThrow(message);
    expect(meter).toHaveBeenLastCalledWith({
      eventName: "retrieval.provider.call",
      payload: expect.objectContaining({ outcome }),
    });
  }
  expect(meter).toHaveBeenCalledWith({
    eventName: "retrieval.quality.proxy",
    payload: expect.objectContaining({
      citationQualityProxy: 0.92,
      confidenceProxy: 0.84,
      recallProxy: 0.5,
    }),
  });
});
