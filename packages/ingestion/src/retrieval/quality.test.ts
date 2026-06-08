import { describe, expect, it } from "vitest";
import { computeRetrievalQualitySignal } from "./quality";

describe("retrieval quality signals", () => {
  it("infers used chunks from assistant text and computes Recall@k", () => {
    const signal = computeRetrievalQualitySignal({
      assistantText:
        "The answer uses Newton's second law: force equals mass times acceleration.",
      candidates: [
        {
          chunkId: "used",
          content:
            "Newton second law force equals mass times acceleration in mechanics.",
        },
        {
          chunkId: "unused",
          content: "Cell membranes use osmosis and diffusion gradients.",
        },
      ],
      query: "force formula",
    });

    expect(signal.inferredUsedChunkIds).toEqual(["used"]);
    expect(signal.recallAtK["recall@1"]).toBe(1);
    expect(signal.precisionAtK["p@1"]).toBe(1);
    expect(signal.queryHash).toHaveLength(64);
  });
});
