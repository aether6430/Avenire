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
        errorMessage: "billing usage offline",
        loadFailed: true,
        loading: false,
      })
    ).toBe("billing usage offline");

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
        errorMessage: "billing usage offline",
        loadFailed: true,
        loading: false,
        readyLabel: "1,200",
      })
    ).toEqual({
      label: "billing usage offline",
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
