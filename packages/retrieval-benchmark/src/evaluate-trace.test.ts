import { describe, expect, it } from "vitest";
import { BenchmarkDataset } from "./domain";
import { evaluateQueryTrace } from "./evaluate-trace";

describe("trace evaluation", () => {
  it("scores every production stage against materialized evidence", () => {
    const dataset = new BenchmarkDataset({
      schemaVersion: 1,
      evidence: [
        {
          artifactId: "paper",
          description: "method",
          id: "evidence-a",
          locator: { kind: "page", page: 2 },
          modality: "text",
        },
      ],
      judgments: [
        {
          assessor: "test",
          evidenceId: "evidence-a",
          grade: 3,
          queryId: "query-a",
          rationale: "direct support",
        },
      ],
      queries: [
        {
          domain: "test",
          family: "direct-fact",
          id: "query-a",
          requiredEvidenceGroups: [["evidence-a"]],
          split: "development",
          text: "test query",
        },
      ],
    });

    const results = evaluateQueryTrace({
      dataset,
      materializedEvidence: [
        { chunkIds: ["relevant-chunk"], evidenceId: "evidence-a" },
      ],
      queryId: "query-a",
      snapshots: [
        {
          candidates: [
            { chunkId: "distractor", score: 0.9 },
            { chunkId: "relevant-chunk", score: 0.8 },
          ],
          path: "full",
          queryKind: "original",
          stage: "dense",
        },
        {
          candidates: [
            { chunkId: "relevant-chunk", score: 0.99 },
            { chunkId: "distractor", score: 0.1 },
          ],
          path: "full",
          queryKind: "original",
          stage: "rerank-output",
        },
      ],
    });

    expect(results).toHaveLength(2);
    expect(results[0]?.evaluation.mrrAt10).toBe(0.5);
    expect(results[0]?.evidenceCoverage).toEqual({
      materializedRequiredEvidenceCount: 1,
      missingRequiredEvidenceIds: [],
      requiredEvidenceCount: 1,
    });
    expect(results[1]?.evaluation.mrrAt10).toBe(1);
    expect(
      results[1]?.evaluation.requiredEvidenceSuccessAtK["all-evidence@1"]
    ).toBe(1);
  });

  it("reports lost ingestion evidence separately from retrieval recall", () => {
    const dataset = new BenchmarkDataset({
      schemaVersion: 1,
      evidence: [
        {
          artifactId: "scan",
          description: "caption",
          id: "missing-evidence",
          locator: { kind: "text", needle: "caption" },
          modality: "text",
        },
      ],
      judgments: [
        {
          assessor: "test",
          evidenceId: "missing-evidence",
          grade: 3,
          queryId: "query",
          rationale: "required",
        },
      ],
      queries: [
        {
          domain: "test",
          family: "direct-fact",
          id: "query",
          requiredEvidenceGroups: [["missing-evidence"]],
          split: "development",
          text: "caption?",
        },
      ],
    });

    const [result] = evaluateQueryTrace({
      dataset,
      materializedEvidence: [{ chunkIds: [], evidenceId: "missing-evidence" }],
      queryId: "query",
      snapshots: [
        {
          candidates: [{ chunkId: "other", score: 1 }],
          path: "full",
          queryKind: "original",
          stage: "final",
        },
      ],
    });

    expect(result?.evaluation.judgedRelevantCount).toBe(0);
    expect(result?.evaluation.recallAtK["recall@10"]).toBeNull();
    expect(result?.evaluation.unanswerable).toBe(false);
    expect(result?.evidenceCoverage).toEqual({
      materializedRequiredEvidenceCount: 0,
      missingRequiredEvidenceIds: ["missing-evidence"],
      requiredEvidenceCount: 1,
    });
  });
});
