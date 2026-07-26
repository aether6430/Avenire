import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Schema } from "effect-v4";
import { describe, expect, it } from "vitest";
import { BenchmarkCorpusManifest, BenchmarkDataset } from "./domain";
import { validateBenchmarkDataset } from "./validation";

const dataRoot = resolve(import.meta.dirname, "../data");

describe("benchmark dataset validation", () => {
  it("accepts the checked-in controlled corpus contract", () => {
    const manifest = Schema.decodeUnknownSync(BenchmarkCorpusManifest)(
      JSON.parse(readFileSync(resolve(dataRoot, "manifest.json"), "utf8"))
    );
    const dataset = Schema.decodeUnknownSync(BenchmarkDataset)(
      JSON.parse(readFileSync(resolve(dataRoot, "dataset.json"), "utf8"))
    );

    expect(validateBenchmarkDataset(manifest, dataset)).toEqual([]);
  });

  it("rejects unsafe source paths and missing required judgments", () => {
    const manifest = new BenchmarkCorpusManifest({
      schemaVersion: 1,
      corpusId: "test",
      version: "1",
      artifacts: [
        {
          id: "artifact",
          title: "Artifact",
          domain: "test",
          sourceType: "markdown",
          format: "markdown",
          path: "../escape.md",
          mimeType: "text/markdown",
          byteSize: 1,
          sha256: "0".repeat(64),
          license: "CC0-1.0",
          licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
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
          id: "evidence",
          artifactId: "artifact",
          modality: "text",
          locator: { kind: "document" },
          description: "test",
        },
      ],
      queries: [
        {
          id: "query",
          text: "test",
          family: "direct-fact",
          domain: "test",
          split: "development",
          requiredEvidenceGroups: [["evidence"]],
        },
      ],
      judgments: [],
    });

    expect(
      validateBenchmarkDataset(manifest, dataset).map((issue) => issue.code)
    ).toEqual(
      expect.arrayContaining([
        "unsafe-artifact-path",
        "required-evidence-not-relevant",
      ])
    );
  });
});
