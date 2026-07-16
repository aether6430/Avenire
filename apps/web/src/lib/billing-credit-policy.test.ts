import { describe, expect, it } from "vitest";
import {
  canRemoveLegacyCreditLedger,
  getPolarCreditMode,
  requirePolarCreditConfiguration,
} from "./billing-credit-policy";

describe("Polar credit migration policy", () => {
  it("keeps the legacy shadow flag backward compatible", () => {
    expect(getPolarCreditMode({ POLAR_CREDITS_SHADOW_MODE: "true" })).toBe(
      "shadow"
    );
  });

  it("requires explicit Polar meter configuration before shadow or cutover", () => {
    expect(() =>
      requirePolarCreditConfiguration({ POLAR_CREDITS_MODE: "cutover" })
    ).toThrow(/EVENT_NAME/);
  });

  it("uses the configured reconciliation threshold", () => {
    expect(
      requirePolarCreditConfiguration({
        POLAR_CREDITS_DIVERGENCE_THRESHOLD_RATIO: "0.025",
        POLAR_CREDITS_EVENT_NAME: "credits.consumed",
        POLAR_CREDITS_METER_ID: "meter-id",
        POLAR_CREDITS_MODE: "shadow",
      }).divergenceThresholdRatio
    ).toBe(0.025);
  });

  it("blocks ledger removal until every seven-day exit criterion is proven", () => {
    const evidence = {
      consecutiveMatchingDays: 7,
      hasConcurrentAdmissionEvidence: true,
      hasOutageAndRetryEvidence: true,
      hasRefundEvidence: true,
      hasRenewalEvidence: true,
      unexplainedDivergences: 0,
    };
    expect(canRemoveLegacyCreditLedger(evidence)).toBe(true);
    expect(
      canRemoveLegacyCreditLedger({ ...evidence, hasRefundEvidence: false })
    ).toBe(false);
    expect(
      canRemoveLegacyCreditLedger({ ...evidence, consecutiveMatchingDays: 6 })
    ).toBe(false);
  });
});
