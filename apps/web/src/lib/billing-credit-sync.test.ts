import { describe, expect, it } from "vitest";
import { compareCreditConsumption } from "./billing-credit-sync";

describe("compareCreditConsumption", () => {
  it("accepts balances within the one percent shadow threshold", () => {
    expect(
      compareCreditConsumption({
        localConsumedUnits: 1000,
        polarConsumedUnits: 991,
      })
    ).toMatchObject({ diverged: false, divergenceRatio: 0.009 });
  });

  it("flags injected local and Polar divergence", () => {
    expect(
      compareCreditConsumption({
        localConsumedUnits: 100,
        polarConsumedUnits: 95,
      })
    ).toMatchObject({ diverged: true, divergenceRatio: 0.05 });
  });
});
