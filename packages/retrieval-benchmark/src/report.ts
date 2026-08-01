import type {
  BenchmarkCorpusManifest,
  BenchmarkDataset,
  BenchmarkQuery,
} from "./domain";
import {
  type EvaluatedTraceSnapshot,
  evaluateQueryTrace,
} from "./evaluate-trace";
import { type AggregateEvaluation, aggregateEvaluations } from "./metrics";
import type { BenchmarkRun } from "./run-contract";

export type SliceDimension =
  | "all"
  | "domain"
  | "query-family"
  | "source-type"
  | "file-format"
  | "evidence-modality";

export interface BenchmarkReportSlice {
  readonly dimension: SliceDimension;
  readonly evaluation: AggregateEvaluation;
  readonly materializationFailureCount: number;
  readonly path: "fast" | "full";
  readonly queryCount: number;
  readonly queryKind: "original" | "expanded" | "decomposed" | "hyde";
  readonly stage: string;
  readonly value: string;
}

export interface BenchmarkReport {
  readonly configurationId: string;
  readonly corpusId: string;
  readonly corpusVersion: string;
  readonly datasetVersion: string;
  readonly failureCount: number;
  readonly modelId: string;
  readonly runId: string;
  readonly slices: readonly BenchmarkReportSlice[];
  readonly stageLosses: readonly BenchmarkStageLoss[];
}

export interface BenchmarkStageLoss {
  readonly firstSeenStage: string | null;
  readonly lastSeenStage: string | null;
  readonly lostAfterStage: string | null;
  readonly queryId: string;
  readonly requiredEvidenceGroup: readonly string[];
}

interface EvaluatedQuerySnapshot extends EvaluatedTraceSnapshot {
  readonly query: BenchmarkQuery;
}

interface SliceDescriptor {
  readonly dimension: SliceDimension;
  readonly value: string;
}

function descriptorsForQuery(
  query: BenchmarkQuery,
  dataset: BenchmarkDataset,
  manifest: BenchmarkCorpusManifest
): SliceDescriptor[] {
  const evidenceIds = new Set(query.requiredEvidenceGroups.flat());
  const evidence = dataset.evidence.filter((target) =>
    evidenceIds.has(target.id)
  );
  const artifacts = evidence
    .map((target) =>
      manifest.artifacts.find((artifact) => artifact.id === target.artifactId)
    )
    .filter((artifact) => artifact !== undefined);
  const descriptors: SliceDescriptor[] = [
    { dimension: "all", value: "all" },
    { dimension: "domain", value: query.domain },
    { dimension: "query-family", value: query.family },
  ];
  for (const value of new Set(
    artifacts.map((artifact) => artifact.sourceType)
  )) {
    descriptors.push({ dimension: "source-type", value });
  }
  for (const value of new Set(artifacts.map((artifact) => artifact.format))) {
    descriptors.push({ dimension: "file-format", value });
  }
  for (const value of new Set(evidence.map((target) => target.modality))) {
    descriptors.push({ dimension: "evidence-modality", value });
  }
  return descriptors;
}

function sliceKey(
  snapshot: EvaluatedQuerySnapshot,
  descriptor: SliceDescriptor
) {
  return [
    snapshot.path,
    snapshot.queryKind,
    snapshot.stage,
    descriptor.dimension,
    descriptor.value,
  ].join("\u0000");
}

export function buildBenchmarkReport(input: {
  readonly dataset: BenchmarkDataset;
  readonly manifest: BenchmarkCorpusManifest;
  readonly run: BenchmarkRun;
}): BenchmarkReport {
  if (
    input.run.corpusId !== input.manifest.corpusId ||
    input.run.corpusVersion !== input.manifest.version
  ) {
    throw new Error(
      `Run corpus ${input.run.corpusId}@${input.run.corpusVersion} does not match ${input.manifest.corpusId}@${input.manifest.version}`
    );
  }

  const evaluated: EvaluatedQuerySnapshot[] = input.run.traces.flatMap(
    (trace) => {
      const query = input.dataset.queries.find(
        (candidate) => candidate.id === trace.queryId
      );
      if (!query) {
        return [];
      }
      return evaluateQueryTrace({
        dataset: input.dataset,
        materializedEvidence: input.run.materializedEvidence,
        queryId: trace.queryId,
        snapshots: trace.snapshots,
      }).map((snapshot) => ({ ...snapshot, query }));
    }
  );

  const groups = new Map<
    string,
    { descriptor: SliceDescriptor; snapshots: EvaluatedQuerySnapshot[] }
  >();
  for (const snapshot of evaluated) {
    for (const descriptor of descriptorsForQuery(
      snapshot.query,
      input.dataset,
      input.manifest
    )) {
      const key = sliceKey(snapshot, descriptor);
      const group = groups.get(key) ?? { descriptor, snapshots: [] };
      group.snapshots.push(snapshot);
      groups.set(key, group);
    }
  }

  const slices = Array.from(groups.values())
    .map(({ descriptor, snapshots }): BenchmarkReportSlice => {
      const first = snapshots[0];
      if (!first) {
        throw new Error("Benchmark report slice cannot be empty");
      }
      return {
        dimension: descriptor.dimension,
        evaluation: aggregateEvaluations(
          snapshots.map((snapshot) => snapshot.evaluation)
        ),
        materializationFailureCount: snapshots.filter(
          (snapshot) =>
            snapshot.evidenceCoverage.missingRequiredEvidenceIds.length > 0
        ).length,
        path: first.path,
        queryCount: snapshots.length,
        queryKind: first.queryKind,
        stage: first.stage,
        value: descriptor.value,
      };
    })
    .sort((left, right) =>
      [left.stage, left.dimension, left.value]
        .join("/")
        .localeCompare([right.stage, right.dimension, right.value].join("/"))
    );

  const materializedById = new Map(
    input.run.materializedEvidence.map((item) => [
      item.evidenceId,
      item.chunkIds,
    ])
  );
  const stageLosses: BenchmarkStageLoss[] = input.run.traces.flatMap(
    (trace) => {
      const query = input.dataset.queries.find(
        (item) => item.id === trace.queryId
      );
      if (!query) {
        return [];
      }
      return query.requiredEvidenceGroups.map((requiredEvidenceGroup) => {
        const relevant = new Set(
          requiredEvidenceGroup.flatMap(
            (evidenceId) => materializedById.get(evidenceId) ?? []
          )
        );
        const seenStages = trace.snapshots
          .filter((snapshot) =>
            snapshot.candidates.some((candidate) =>
              relevant.has(candidate.chunkId)
            )
          )
          .map((snapshot) => snapshot.stage);
        const firstSeenStage = seenStages[0] ?? null;
        const lastSeenStage = seenStages.at(-1) ?? null;
        const finalHasEvidence = trace.snapshots
          .filter((snapshot) => snapshot.stage === "final")
          .some((snapshot) =>
            snapshot.candidates.some((candidate) =>
              relevant.has(candidate.chunkId)
            )
          );
        return {
          firstSeenStage,
          lastSeenStage,
          lostAfterStage:
            firstSeenStage !== null && !finalHasEvidence ? lastSeenStage : null,
          queryId: query.id,
          requiredEvidenceGroup,
        };
      });
    }
  );

  return {
    configurationId: input.run.configurationId,
    corpusId: input.run.corpusId,
    corpusVersion: input.run.corpusVersion,
    datasetVersion: input.dataset.version ?? "unversioned",
    failureCount: input.run.failures.length,
    modelId: input.run.modelId,
    runId: input.run.runId,
    slices,
    stageLosses,
  };
}
