import { describe, expect, it } from "vitest";
import {
  getBillingPlanLabel,
  getBillingValueState,
} from "./settings-billing-model";

describe("settings billing model", () => {
  it("keeps billing loading, failure, and ready labels distinct", () => {
    expect(
      getBillingPlanLabel({
        billingUsagePlan: null,
        loadFailed: false,
        loading: true,
      })
    ).toBe("Loading plan...");

    expect(
      getBillingPlanLabel({
        billingUsagePlan: null,
        loadFailed: true,
        loading: false,
      })
    ).toBe("Plan unavailable");

    expect(
      getBillingPlanLabel({
        billingUsagePlan: "core",
        loadFailed: false,
        loading: false,
      })
    ).toBe("Core Plan");

    expect(
      getBillingValueState({
        loadFailed: false,
        loading: true,
        readyLabel: "1,200",
      })
    ).toEqual({
      label: "Loading...",
      showSpinner: true,
    });

    expect(
      getBillingValueState({
        loadFailed: true,
        loading: false,
        readyLabel: "1,200",
      })
    ).toEqual({
      label: "Unavailable",
      showSpinner: false,
    });

    expect(
      getBillingValueState({
        loadFailed: false,
        loading: false,
        readyLabel: "1,200",
      })
    ).toEqual({
      label: "1,200",
      showSpinner: false,
    });
  });
});
