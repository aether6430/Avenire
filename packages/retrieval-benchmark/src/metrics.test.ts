import { describe, expect, it } from "vitest";
import { aggregateEvaluations, evaluateRanking } from "./metrics";

describe("retrieval benchmark metrics", () => {
  it("computes binary and graded metrics from independent qrels", () => {
    const result = evaluateRanking({
      judgments: { a: 3, b: 2, c: 1 },
      ranking: [
        { id: "b", score: 0.9 },
        { id: "x", score: 0.8 },
        { id: "a", score: 0.7 },
        { id: "c", score: 0.6 },
      ],
      kValues: [1, 3],
    });

    expect(result.precisionAtK["p@1"]).toBe(1);
    expect(result.precisionAtK["p@3"]).toBeCloseTo(2 / 3);
    expect(result.recallAtK["recall@1"]).toBe(0.5);
    expect(result.recallAtK["recall@3"]).toBe(1);
    expect(result.mrrAt10).toBe(1);
    expect(result.averagePrecision).toBeCloseTo(5 / 6);
    expect(result.ndcgAtK["ndcg@3"]).toBeGreaterThan(0);
    expect(result.ndcgAtK["ndcg@3"]).toBeLessThan(1);
  });

  it("penalizes short rankings using k as the precision denominator", () => {
    const result = evaluateRanking({
      judgments: { a: 3, b: 2 },
      ranking: [{ id: "a" }],
      kValues: [5],
    });

    expect(result.precisionAtK["p@5"]).toBe(0.2);
    expect(result.recallAtK["recall@5"]).toBe(0.5);
  });

  it("deduplicates repeated result IDs", () => {
    const result = evaluateRanking({
      judgments: { a: 3, b: 2 },
      ranking: [{ id: "a" }, { id: "a" }, { id: "b" }],
      kValues: [2],
    });

    expect(result.returnedCount).toBe(2);
    expect(result.recallAtK["recall@2"]).toBe(1);
  });

  it("requires every evidence group for multi-hop success", () => {
    const result = evaluateRanking({
      judgments: { a: 3, b: 3 },
      ranking: [{ id: "a" }, { id: "x" }, { id: "b" }],
      requiredEvidenceGroups: [["a", "a-alternative"], ["b"]],
      kValues: [2, 3],
    });

    expect(result.requiredEvidenceSuccessAtK["all-evidence@2"]).toBe(0);
    expect(result.requiredEvidenceSuccessAtK["all-evidence@3"]).toBe(1);
  });

  it("excludes unanswerable queries from relevance metric means", () => {
    const answerable = evaluateRanking({
      judgments: { a: 3 },
      ranking: [{ id: "a" }],
      kValues: [1],
    });
    const unanswerable = evaluateRanking({
      judgments: {},
      ranking: [{ id: "x" }],
      kValues: [1],
    });
    const aggregate = aggregateEvaluations([answerable, unanswerable]);

    expect(aggregate.recallAtK["recall@1"]).toBe(1);
    expect(aggregate.unanswerableQueryCount).toBe(1);
    expect(aggregate.evaluatedQueryCount).toBe(2);
  });

  it("does not classify missing answerable evidence as unanswerable", () => {
    const ingestionFailure = evaluateRanking({
      judgments: {},
      ranking: [{ id: "unrelated" }],
      unanswerable: false,
    });

    expect(
      aggregateEvaluations([ingestionFailure]).unanswerableQueryCount
    ).toBe(0);
  });
});
