import { describe, expect, it } from "vitest";
import {
  classifyStrength,
  type SlicePerformance,
} from "./strength-classification";

const baseline: SlicePerformance = {
  baselineDelta: 0,
  baselineDeltaConfidence95: [-0.01, 0.01],
  costAdvantage: false,
  failureRate: 0,
  gapToBest: 0.01,
  ndcgAt10: 0.78,
  queryCount: 80,
  recallAt10: 0.9,
};

describe("strength classification", () => {
  it("refuses to classify undersized slices", () => {
    expect(classifyStrength({ ...baseline, queryCount: 39 }).label).toBe(
      "unsupported"
    );
  });

  it("marks statistically material improvements as dominant", () => {
    expect(
      classifyStrength({
        ...baseline,
        baselineDelta: 0.06,
        baselineDeltaConfidence95: [0.02, 0.1],
      }).label
    ).toBe("dominant");
  });

  it("does not call an uncertain improvement dominant", () => {
    expect(
      classifyStrength({
        ...baseline,
        baselineDelta: 0.06,
        baselineDeltaConfidence95: [-0.01, 0.12],
      }).label
    ).toBe("strong");
  });

  it("classifies a lower-cost configuration as competitive when quality floors hold", () => {
    expect(
      classifyStrength({
        ...baseline,
        costAdvantage: true,
        gapToBest: 0.08,
      }).label
    ).toBe("competitive");
  });

  it("marks quality-floor misses as weak", () => {
    expect(classifyStrength({ ...baseline, recallAt10: 0.7 }).label).toBe(
      "weak"
    );
  });
});
