export interface RankedItem {
  readonly id: string;
  readonly score?: number;
}

export interface RankingEvaluationInput {
  readonly judgments: Readonly<Record<string, number>>;
  readonly kValues?: readonly number[];
  readonly ranking: readonly RankedItem[];
  readonly relevantThreshold?: number;
  readonly requiredEvidenceGroups?: readonly (readonly string[])[];
  readonly unanswerable?: boolean;
}

export interface RankingEvaluation {
  readonly averagePrecision: number | null;
  readonly judgedRelevantCount: number;
  readonly mrrAt10: number | null;
  readonly ndcgAtK: Readonly<Record<string, number | null>>;
  readonly precisionAtK: Readonly<Record<string, number | null>>;
  readonly recallAtK: Readonly<Record<string, number | null>>;
  readonly requiredEvidenceSuccessAtK: Readonly<Record<string, number | null>>;
  readonly returnedCount: number;
  readonly unanswerable: boolean;
}

export interface AggregateEvaluation {
  readonly answerableQueryCount: number;
  readonly averagePrecision: number | null;
  readonly evaluatedQueryCount: number;
  readonly mrrAt10: number | null;
  readonly ndcgAtK: Readonly<Record<string, number | null>>;
  readonly precisionAtK: Readonly<Record<string, number | null>>;
  readonly recallAtK: Readonly<Record<string, number | null>>;
  readonly requiredEvidenceSuccessAtK: Readonly<Record<string, number | null>>;
  readonly unanswerableFalsePositiveRate: number | null;
  readonly unanswerableQueryCount: number;
}

const DEFAULT_K_VALUES = [1, 3, 5, 10, 20, 50] as const;

const finiteGrade = (value: number | undefined) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;

function dedupeRanking(ranking: readonly RankedItem[]): RankedItem[] {
  const seen = new Set<string>();
  const unique: RankedItem[] = [];
  for (const item of ranking) {
    if (item.id.length === 0 || seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    unique.push(item);
  }
  return unique;
}

function discountedCumulativeGain(
  grades: readonly number[],
  cutoff: number
): number {
  return grades.slice(0, cutoff).reduce((total, grade, index) => {
    const gain = 2 ** grade - 1;
    return total + gain / Math.log2(index + 2);
  }, 0);
}

function mean(values: readonly (number | null)[]): number | null {
  const measured = values.filter((value): value is number => value !== null);
  if (measured.length === 0) {
    return null;
  }
  return measured.reduce((total, value) => total + value, 0) / measured.length;
}

function metricKeys(
  evaluations: readonly RankingEvaluation[],
  field: "ndcgAtK" | "precisionAtK" | "recallAtK" | "requiredEvidenceSuccessAtK"
): string[] {
  return Array.from(
    new Set(evaluations.flatMap((evaluation) => Object.keys(evaluation[field])))
  ).sort(
    (left, right) => Number(left.split("@")[1]) - Number(right.split("@")[1])
  );
}

function aggregateMetricRecord(
  evaluations: readonly RankingEvaluation[],
  field: "ndcgAtK" | "precisionAtK" | "recallAtK" | "requiredEvidenceSuccessAtK"
): Readonly<Record<string, number | null>> {
  return Object.fromEntries(
    metricKeys(evaluations, field).map((key) => [
      key,
      mean(evaluations.map((evaluation) => evaluation[field][key] ?? null)),
    ])
  );
}

export function evaluateRanking(
  input: RankingEvaluationInput
): RankingEvaluation {
  const relevantThreshold = input.relevantThreshold ?? 2;
  const kValues = Array.from(new Set(input.kValues ?? DEFAULT_K_VALUES)).filter(
    (value) => Number.isInteger(value) && value > 0
  );
  const ranking = dedupeRanking(input.ranking);
  const relevantIds = new Set(
    Object.entries(input.judgments)
      .filter(([, grade]) => finiteGrade(grade) >= relevantThreshold)
      .map(([id]) => id)
  );
  const judgedRelevantCount = relevantIds.size;
  const rankedGrades = ranking.map((item) =>
    finiteGrade(input.judgments[item.id])
  );
  const idealGrades = Object.values(input.judgments)
    .map(finiteGrade)
    .sort((left, right) => right - left);
  const relevantRanks = ranking
    .map((item, index) => (relevantIds.has(item.id) ? index + 1 : null))
    .filter((rank): rank is number => rank !== null);
  const precisionAtK: Record<string, number | null> = {};
  const recallAtK: Record<string, number | null> = {};
  const ndcgAtK: Record<string, number | null> = {};
  const requiredEvidenceSuccessAtK: Record<string, number | null> = {};

  for (const k of kValues) {
    const topIds = new Set(ranking.slice(0, k).map((item) => item.id));
    const hitCount = Array.from(topIds).filter((id) =>
      relevantIds.has(id)
    ).length;
    precisionAtK[`p@${k}`] = judgedRelevantCount > 0 ? hitCount / k : null;
    recallAtK[`recall@${k}`] =
      judgedRelevantCount > 0 ? hitCount / judgedRelevantCount : null;
    const ideal = discountedCumulativeGain(idealGrades, k);
    ndcgAtK[`ndcg@${k}`] =
      ideal > 0 ? discountedCumulativeGain(rankedGrades, k) / ideal : null;

    const groups = input.requiredEvidenceGroups ?? [];
    requiredEvidenceSuccessAtK[`all-evidence@${k}`] =
      groups.length > 0
        ? Number(
            groups.every((alternatives) =>
              alternatives.some((id) => topIds.has(id))
            )
          )
        : null;
  }

  let cumulativePrecision = 0;
  let hits = 0;
  ranking.forEach((item, index) => {
    if (!relevantIds.has(item.id)) {
      return;
    }
    hits += 1;
    cumulativePrecision += hits / (index + 1);
  });

  return {
    averagePrecision:
      judgedRelevantCount > 0
        ? cumulativePrecision / judgedRelevantCount
        : null,
    judgedRelevantCount,
    mrrAt10:
      judgedRelevantCount > 0
        ? 1 /
          (relevantRanks.find((rank) => rank <= 10) ?? Number.POSITIVE_INFINITY)
        : null,
    ndcgAtK,
    precisionAtK,
    recallAtK,
    requiredEvidenceSuccessAtK,
    returnedCount: ranking.length,
    unanswerable: input.unanswerable ?? judgedRelevantCount === 0,
  };
}

export function aggregateEvaluations(
  evaluations: readonly RankingEvaluation[]
): AggregateEvaluation {
  return {
    answerableQueryCount: evaluations.filter(
      (evaluation) => !evaluation.unanswerable
    ).length,
    averagePrecision: mean(
      evaluations.map((evaluation) => evaluation.averagePrecision)
    ),
    evaluatedQueryCount: evaluations.length,
    mrrAt10: mean(evaluations.map((evaluation) => evaluation.mrrAt10)),
    ndcgAtK: aggregateMetricRecord(evaluations, "ndcgAtK"),
    precisionAtK: aggregateMetricRecord(evaluations, "precisionAtK"),
    recallAtK: aggregateMetricRecord(evaluations, "recallAtK"),
    requiredEvidenceSuccessAtK: aggregateMetricRecord(
      evaluations,
      "requiredEvidenceSuccessAtK"
    ),
    unanswerableQueryCount: evaluations.filter(
      (evaluation) => evaluation.unanswerable
    ).length,
    unanswerableFalsePositiveRate: mean(
      evaluations
        .filter((evaluation) => evaluation.unanswerable)
        .map((evaluation) => Number(evaluation.returnedCount > 0))
    ),
  };
}
