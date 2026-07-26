export type StrengthLabel =
  | "dominant"
  | "strong"
  | "competitive"
  | "weak"
  | "unsupported";

export interface StrengthThresholds {
  readonly competitiveMaximumGapToBest: number;
  readonly dominantMinimumDelta: number;
  readonly maximumFailureRate: number;
  readonly minimumNdcgAt10: number;
  readonly minimumQueryCount: number;
  readonly minimumRecallAt10: number;
  readonly strongMaximumGapToBest: number;
}

export interface SlicePerformance {
  readonly baselineDelta: number;
  readonly baselineDeltaConfidence95: readonly [number, number];
  readonly costAdvantage: boolean;
  readonly failureRate: number;
  readonly gapToBest: number;
  readonly ndcgAt10: number;
  readonly queryCount: number;
  readonly recallAt10: number;
}

export interface StrengthClassification {
  readonly label: StrengthLabel;
  readonly reasons: readonly string[];
}

export const DEFAULT_STRENGTH_THRESHOLDS: StrengthThresholds = {
  competitiveMaximumGapToBest: 0.05,
  dominantMinimumDelta: 0.05,
  maximumFailureRate: 0.05,
  minimumNdcgAt10: 0.7,
  minimumQueryCount: 40,
  minimumRecallAt10: 0.8,
  strongMaximumGapToBest: 0.02,
};

export function classifyStrength(
  performance: SlicePerformance,
  thresholds: StrengthThresholds = DEFAULT_STRENGTH_THRESHOLDS
): StrengthClassification {
  if (performance.queryCount < thresholds.minimumQueryCount) {
    return {
      label: "unsupported",
      reasons: [
        `Only ${performance.queryCount} judged queries; at least ${thresholds.minimumQueryCount} are required`,
      ],
    };
  }
  if (performance.failureRate > thresholds.maximumFailureRate) {
    return {
      label: "unsupported",
      reasons: [
        `Failure rate ${performance.failureRate.toFixed(3)} exceeds ${thresholds.maximumFailureRate.toFixed(3)}`,
      ],
    };
  }

  const missesQualityFloor =
    performance.ndcgAt10 < thresholds.minimumNdcgAt10 ||
    performance.recallAt10 < thresholds.minimumRecallAt10;
  if (missesQualityFloor) {
    return {
      label: "weak",
      reasons: [
        `Quality floor missed: nDCG@10=${performance.ndcgAt10.toFixed(3)}, Recall@10=${performance.recallAt10.toFixed(3)}`,
      ],
    };
  }

  if (
    performance.baselineDelta >= thresholds.dominantMinimumDelta &&
    performance.baselineDeltaConfidence95[0] > 0
  ) {
    return {
      label: "dominant",
      reasons: [
        `Baseline delta ${performance.baselineDelta.toFixed(3)} is material and its paired 95% interval excludes zero`,
      ],
    };
  }

  if (performance.gapToBest <= thresholds.strongMaximumGapToBest) {
    return {
      label: "strong",
      reasons: [
        `Within ${thresholds.strongMaximumGapToBest.toFixed(3)} of the best configuration while meeting quality floors`,
      ],
    };
  }

  if (
    performance.gapToBest <= thresholds.competitiveMaximumGapToBest ||
    performance.costAdvantage
  ) {
    return {
      label: "competitive",
      reasons: [
        performance.costAdvantage
          ? "Meets quality floors and offers a material cost or latency advantage"
          : `Within ${thresholds.competitiveMaximumGapToBest.toFixed(3)} of the best configuration`,
      ],
    };
  }

  return {
    label: "weak",
    reasons: [
      `Trails the best configuration by ${performance.gapToBest.toFixed(3)}`,
    ],
  };
}
