import { Effect, Layer } from "effect-v4";
import { describe, expect, it } from "vitest";
import { BenchmarkDataset } from "./domain";
import { BenchmarkRetriever, executeBenchmarkRun } from "./runner";

describe("benchmark runner", () => {
  it("captures retriever stages in the immutable run contract", async () => {
    const dataset = new BenchmarkDataset({
      schemaVersion: 1,
      evidence: [],
      judgments: [],
      queries: [
        {
          domain: "test",
          family: "unanswerable",
          id: "query",
          requiredEvidenceGroups: [],
          split: "test",
          text: "query",
        },
      ],
    });
    const RetrieverTest = Layer.succeed(BenchmarkRetriever)({
      retrieve: ({ trace }) =>
        Effect.sync(() =>
          trace({
            candidates: [{ chunkId: "chunk", score: 1 }],
            path: "full",
            queryKind: "original",
            stage: "final",
          })
        ),
    });

    const run = await executeBenchmarkRun({
      dataset,
      materializedEvidence: [],
      metadata: {
        configurationId: "configuration",
        corpusId: "corpus",
        corpusVersion: "1",
        createdAt: "2026-07-22T00:00:00Z",
        embeddingModelId: "embedding",
        gitSha: "abc",
        modelId: "model",
        rerankerModelId: "reranker",
        runId: "run",
      },
    }).pipe(Effect.provide(RetrieverTest), Effect.runPromise);

    expect(run.traces[0]?.snapshots[0]?.stage).toBe("final");
    expect(run.failures).toEqual([]);
  });
});
