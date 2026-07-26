import { describe, expect, it } from "vitest";
import { materializeEvidence } from "./materialize-qrels";

describe("evidence materialization", () => {
  it("maps stable locators to run-specific chunks", () => {
    const result = materializeEvidence(
      [
        {
          artifactId: "lecture-1",
          evidenceId: "entropy-definition",
          locator: { kind: "time", startMs: 20_000, endMs: 35_000 },
        },
        {
          artifactId: "paper-1",
          evidenceId: "formula-page",
          locator: { kind: "page", page: 4 },
        },
      ],
      [
        {
          artifactId: "lecture-1",
          chunkId: "video-chunk-2",
          content: "entropy definition",
          startMs: 18_000,
          endMs: 28_000,
        },
        {
          artifactId: "paper-1",
          chunkId: "pdf-chunk-4",
          content: "the formula",
          page: 4,
        },
      ]
    );

    expect(result).toEqual([
      { evidenceId: "entropy-definition", chunkIds: ["video-chunk-2"] },
      { evidenceId: "formula-page", chunkIds: ["pdf-chunk-4"] },
    ]);
  });

  it("keeps evidence unmatched when ingestion loses it", () => {
    const result = materializeEvidence(
      [
        {
          artifactId: "scan-1",
          evidenceId: "missing-caption",
          locator: { kind: "text", needle: "latent heat plateau" },
        },
      ],
      [
        {
          artifactId: "scan-1",
          chunkId: "scan-chunk-1",
          content: "unrelated OCR output",
        },
      ]
    );

    expect(result).toEqual([{ evidenceId: "missing-caption", chunkIds: [] }]);
  });
});
