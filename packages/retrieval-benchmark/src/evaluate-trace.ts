import type { BenchmarkDataset } from "./domain";
import type { MaterializedEvidence } from "./materialize-qrels";
import {
  evaluateRanking,
  type RankedItem,
  type RankingEvaluation,
} from "./metrics";

export interface TraceCandidate {
  readonly chunkId: string;
  readonly score: number;
}

export interface TraceSnapshot {
  readonly candidates: readonly TraceCandidate[];
  readonly path: "fast" | "full";
  readonly queryKind: "original" | "expanded" | "decomposed" | "hyde";
  readonly stage: string;
}

export interface EvaluatedTraceSnapshot {
  readonly evaluation: RankingEvaluation;
  readonly evidenceCoverage: EvidenceMaterializationCoverage;
  readonly path: "fast" | "full";
  readonly queryId: string;
  readonly queryKind: "original" | "expanded" | "decomposed" | "hyde";
  readonly stage: string;
}

export interface EvidenceMaterializationCoverage {
  readonly materializedRequiredEvidenceCount: number;
  readonly missingRequiredEvidenceIds: readonly string[];
  readonly requiredEvidenceCount: number;
}

function materializedByEvidenceId(
  materialized: readonly MaterializedEvidence[]
) {
  return new Map(
    materialized.map((evidence) => [evidence.evidenceId, evidence.chunkIds])
  );
}

function chunkJudgmentsForQuery(
  dataset: BenchmarkDataset,
  queryId: string,
  materialized: ReadonlyMap<string, readonly string[]>
) {
  const judgments: Record<string, number> = {};
  for (const judgment of dataset.judgments) {
    if (judgment.queryId !== queryId) {
      continue;
    }
    for (const chunkId of materialized.get(judgment.evidenceId) ?? []) {
      judgments[chunkId] = Math.max(judgments[chunkId] ?? 0, judgment.grade);
    }
  }
  return judgments;
}

function requiredChunkGroups(
  evidenceGroups: readonly (readonly string[])[],
  materialized: ReadonlyMap<string, readonly string[]>
) {
  return evidenceGroups.map((evidenceAlternatives) =>
    Array.from(
      new Set(
        evidenceAlternatives.flatMap(
          (evidenceId) => materialized.get(evidenceId) ?? []
        )
      )
    )
  );
}

function evidenceCoverage(
  evidenceGroups: readonly (readonly string[])[],
  materialized: ReadonlyMap<string, readonly string[]>
): EvidenceMaterializationCoverage {
  const requiredEvidenceIds = Array.from(new Set(evidenceGroups.flat()));
  const missingRequiredEvidenceIds = requiredEvidenceIds.filter(
    (evidenceId) => (materialized.get(evidenceId)?.length ?? 0) === 0
  );
  return {
    materializedRequiredEvidenceCount:
      requiredEvidenceIds.length - missingRequiredEvidenceIds.length,
    missingRequiredEvidenceIds,
    requiredEvidenceCount: requiredEvidenceIds.length,
  };
}

function rankedItems(candidates: readonly TraceCandidate[]): RankedItem[] {
  return candidates.map((candidate) => ({
    id: candidate.chunkId,
    score: candidate.score,
  }));
}

export function evaluateQueryTrace(input: {
  readonly dataset: BenchmarkDataset;
  readonly materializedEvidence: readonly MaterializedEvidence[];
  readonly queryId: string;
  readonly snapshots: readonly TraceSnapshot[];
}): EvaluatedTraceSnapshot[] {
  const query = input.dataset.queries.find(
    (candidate) => candidate.id === input.queryId
  );
  if (!query) {
    return [];
  }
  const materialized = materializedByEvidenceId(input.materializedEvidence);
  const judgments = chunkJudgmentsForQuery(
    input.dataset,
    query.id,
    materialized
  );
  const requiredEvidenceGroups = requiredChunkGroups(
    query.requiredEvidenceGroups,
    materialized
  );
  const coverage = evidenceCoverage(query.requiredEvidenceGroups, materialized);

  return input.snapshots.map((snapshot) => ({
    evaluation: evaluateRanking({
      judgments,
      ranking: rankedItems(snapshot.candidates),
      requiredEvidenceGroups,
      unanswerable: query.family === "unanswerable",
    }),
    evidenceCoverage: coverage,
    path: snapshot.path,
    queryId: query.id,
    queryKind: snapshot.queryKind,
    stage: snapshot.stage,
  }));
}
