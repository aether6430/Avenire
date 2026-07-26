import { describe, expect, it } from "vitest";
import { BenchmarkCorpusManifest, BenchmarkDataset } from "./domain";
import { buildBenchmarkReport } from "./report";
import { BenchmarkRun } from "./run-contract";

describe("benchmark report", () => {
  it("aggregates stage metrics across format, modality, family, and domain slices", () => {
    const manifest = new BenchmarkCorpusManifest({
      schemaVersion: 1,
      corpusId: "corpus",
      version: "1",
      artifacts: [
        {
          id: "deck",
          title: "Deck",
          domain: "science",
          sourceType: "document",
          format: "pptx",
          path: "deck.pptx",
          mimeType: "application/pptx",
          byteSize: 1,
          sha256: "a".repeat(64),
          license: "CC0-1.0",
          licenseUrl: "https://example.test/license",
          creator: "test",
          attribution: "test",
          redistribution: "allowed",
        },
      ],
    });
    const dataset = new BenchmarkDataset({
      schemaVersion: 1,
      evidence: [
        {
          id: "slide",
          artifactId: "deck",
          modality: "text",
          locator: { kind: "slide", slide: 2 },
          description: "answer",
        },
      ],
      queries: [
        {
          id: "query",
          text: "answer?",
          family: "direct-fact",
          domain: "science",
          split: "test",
          requiredEvidenceGroups: [["slide"]],
        },
      ],
      judgments: [
        {
          queryId: "query",
          evidenceId: "slide",
          grade: 3,
          assessor: "test",
          rationale: "direct",
        },
      ],
    });
    const run = new BenchmarkRun({
      schemaVersion: 1,
      runId: "run",
      createdAt: "2026-07-22T00:00:00Z",
      gitSha: "abc",
      corpusId: "corpus",
      corpusVersion: "1",
      modelId: "model",
      embeddingModelId: "embed",
      rerankerModelId: "rerank",
      configurationId: "full",
      failures: [],
      materializedEvidence: [{ evidenceId: "slide", chunkIds: ["chunk"] }],
      traces: [
        {
          queryId: "query",
          durationMs: 10,
          snapshots: [
            {
              candidates: [{ chunkId: "chunk", score: 1 }],
              path: "full",
              queryKind: "original",
              stage: "final",
            },
          ],
        },
      ],
    });

    const report = buildBenchmarkReport({ dataset, manifest, run });
    expect(report.slices).toHaveLength(6);
    expect(
      report.slices.find((slice) => slice.dimension === "file-format")?.value
    ).toBe("pptx");
    expect(
      report.slices.find((slice) => slice.dimension === "all")?.evaluation
        .mrrAt10
    ).toBe(1);
  });
});
