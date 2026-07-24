import type {
  BenchmarkCorpusManifest,
  BenchmarkDataset,
  BenchmarkQuery,
} from "./domain";

export interface ValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly path: string;
}

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ALLOWED_LICENSES = new Set([
  "CC0-1.0",
  "CC-BY-4.0",
  "CC-BY-SA-4.0",
  "CC-BY-NC-SA-4.0",
  "PDM-1.0",
  "PRIVATE-BENCHMARK",
]);

function duplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return Array.from(duplicates).sort();
}

function requiredEvidenceIds(query: BenchmarkQuery): string[] {
  return query.requiredEvidenceGroups.flat();
}

export function validateBenchmarkDataset(
  manifest: BenchmarkCorpusManifest,
  dataset: BenchmarkDataset
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const artifactIds = new Set(
    manifest.artifacts.map((artifact) => artifact.id)
  );
  const evidenceIds = new Set(dataset.evidence.map((evidence) => evidence.id));
  const queryIds = new Set(dataset.queries.map((query) => query.id));

  for (const duplicate of duplicateValues(
    manifest.artifacts.map((artifact) => artifact.id)
  )) {
    issues.push({
      code: "duplicate-artifact",
      path: `artifacts.${duplicate}`,
      message: `Duplicate artifact ID: ${duplicate}`,
    });
  }
  for (const duplicate of duplicateValues(
    dataset.evidence.map((evidence) => evidence.id)
  )) {
    issues.push({
      code: "duplicate-evidence",
      path: `evidence.${duplicate}`,
      message: `Duplicate evidence ID: ${duplicate}`,
    });
  }
  for (const duplicate of duplicateValues(
    dataset.queries.map((query) => query.id)
  )) {
    issues.push({
      code: "duplicate-query",
      path: `queries.${duplicate}`,
      message: `Duplicate query ID: ${duplicate}`,
    });
  }

  for (const artifact of manifest.artifacts) {
    if (!SHA256_PATTERN.test(artifact.sha256)) {
      issues.push({
        code: "invalid-sha256",
        path: `artifacts.${artifact.id}.sha256`,
        message: "SHA-256 must be 64 lowercase hexadecimal characters",
      });
    }
    const derivationFields = [
      artifact.derivation,
      artifact.upstreamByteSize,
      artifact.upstreamSha256,
    ];
    if (
      derivationFields.some((value) => value !== undefined) &&
      derivationFields.some((value) => value === undefined)
    ) {
      issues.push({
        code: "incomplete-derivation",
        path: `artifacts.${artifact.id}.derivation`,
        message:
          "Derived artifacts require derivation, upstreamByteSize, and upstreamSha256 together",
      });
    }
    if (
      artifact.upstreamSha256 !== undefined &&
      !SHA256_PATTERN.test(artifact.upstreamSha256)
    ) {
      issues.push({
        code: "invalid-upstream-sha256",
        path: `artifacts.${artifact.id}.upstreamSha256`,
        message: "Upstream SHA-256 must be 64 lowercase hexadecimal characters",
      });
    }
    if (
      artifact.derivation?.kind === "media-clip" &&
      artifact.derivation.endMs <= artifact.derivation.startMs
    ) {
      issues.push({
        code: "invalid-media-clip",
        path: `artifacts.${artifact.id}.derivation`,
        message: "Media clip endMs must be greater than startMs",
      });
    }
    if (!ALLOWED_LICENSES.has(artifact.license)) {
      issues.push({
        code: "license-not-allowed",
        path: `artifacts.${artifact.id}.license`,
        message: `License is not in the distributable benchmark allowlist: ${artifact.license}`,
      });
    }
    if (
      artifact.path.startsWith("/") ||
      artifact.path.split(/[\\/]/).includes("..")
    ) {
      issues.push({
        code: "unsafe-artifact-path",
        path: `artifacts.${artifact.id}.path`,
        message:
          "Artifact path must remain inside the benchmark data directory",
      });
    }
  }

  for (const evidence of dataset.evidence) {
    if (!artifactIds.has(evidence.artifactId)) {
      issues.push({
        code: "unknown-artifact",
        path: `evidence.${evidence.id}.artifactId`,
        message: `Unknown artifact ID: ${evidence.artifactId}`,
      });
    }
    if (
      evidence.locator.kind === "time" &&
      evidence.locator.endMs < evidence.locator.startMs
    ) {
      issues.push({
        code: "invalid-time-range",
        path: `evidence.${evidence.id}.locator`,
        message: "Time locator endMs must be greater than or equal to startMs",
      });
    }
  }

  const relevantJudgments = new Set(
    dataset.judgments
      .filter((judgment) => judgment.grade >= 2)
      .map((judgment) => `${judgment.queryId}\u0000${judgment.evidenceId}`)
  );
  const judgmentPairs = dataset.judgments.map(
    (judgment) => `${judgment.queryId}\u0000${judgment.evidenceId}`
  );
  for (const duplicate of duplicateValues(judgmentPairs)) {
    const [queryId, evidenceId] = duplicate.split("\u0000");
    issues.push({
      code: "duplicate-judgment",
      path: `judgments.${queryId}.${evidenceId}`,
      message: "Only one adjudicated grade is allowed per query/evidence pair",
    });
  }

  for (const query of dataset.queries) {
    const evidenceForQuery = requiredEvidenceIds(query);
    if (query.family === "unanswerable" && evidenceForQuery.length > 0) {
      issues.push({
        code: "unanswerable-has-evidence",
        path: `queries.${query.id}.requiredEvidenceGroups`,
        message: "Unanswerable queries cannot declare required evidence",
      });
    }
    if (
      query.family !== "unanswerable" &&
      query.requiredEvidenceGroups.length === 0
    ) {
      issues.push({
        code: "answerable-missing-evidence",
        path: `queries.${query.id}.requiredEvidenceGroups`,
        message: "Answerable queries need at least one required evidence group",
      });
    }
    query.requiredEvidenceGroups.forEach((group, groupIndex) => {
      if (group.length === 0) {
        issues.push({
          code: "empty-evidence-group",
          path: `queries.${query.id}.requiredEvidenceGroups.${groupIndex}`,
          message: "Evidence groups must contain at least one alternative",
        });
      }
    });
    for (const evidenceId of evidenceForQuery) {
      if (!evidenceIds.has(evidenceId)) {
        issues.push({
          code: "unknown-required-evidence",
          path: `queries.${query.id}.requiredEvidenceGroups`,
          message: `Unknown evidence ID: ${evidenceId}`,
        });
      } else if (!relevantJudgments.has(`${query.id}\u0000${evidenceId}`)) {
        issues.push({
          code: "required-evidence-not-relevant",
          path: `queries.${query.id}.requiredEvidenceGroups`,
          message: `Required evidence ${evidenceId} needs an adjudicated grade of at least 2`,
        });
      }
    }
  }

  for (const judgment of dataset.judgments) {
    if (!queryIds.has(judgment.queryId)) {
      issues.push({
        code: "unknown-judgment-query",
        path: `judgments.${judgment.queryId}`,
        message: `Unknown query ID: ${judgment.queryId}`,
      });
    }
    if (!evidenceIds.has(judgment.evidenceId)) {
      issues.push({
        code: "unknown-judgment-evidence",
        path: `judgments.${judgment.queryId}.${judgment.evidenceId}`,
        message: `Unknown evidence ID: ${judgment.evidenceId}`,
      });
    }
  }

  return issues;
}
