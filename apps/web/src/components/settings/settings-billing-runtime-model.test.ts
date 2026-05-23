import { describe, expect, it } from "vitest";
import {
  createBillingUsageLoadFailureState,
  createBillingUsageLoadStartState,
  createBillingUsageLoadSuccessState,
  createSettingsBillingMeters,
  hasSettingsPaidPlan,
  resolveManageBillingStatus,
  shouldLoadInitialBillingUsage,
  shouldPollBillingUsage,
} from "@/components/settings/settings-billing-runtime-model";

describe("settings billing runtime model", () => {
  it("gates initial billing loads and polling to the billing tab", () => {
    expect(
      shouldLoadInitialBillingUsage({
        billingLoaded: false,
        currentTab: "billing",
      })
    ).toBe(true);
    expect(
      shouldLoadInitialBillingUsage({
        billingLoaded: true,
        currentTab: "billing",
      })
    ).toBe(false);
    expect(
      shouldPollBillingUsage({
        billingLoaded: true,
        currentTab: "billing",
      })
    ).toBe(true);
    expect(
      shouldPollBillingUsage({
        billingLoaded: false,
        currentTab: "account",
      })
    ).toBe(false);
  });

  it("creates billing load start, success, and failure states", () => {
    expect(createBillingUsageLoadStartState(true)).toEqual({
      billingErrorMessage: null,
      billingLoadFailed: false,
      billingLoading: true,
      billingStatus: "Loading usage...",
    });

    expect(
      createBillingUsageLoadSuccessState(
        {
          chat: {
            refillAt: "2026-05-20T00:00:00.000Z",
            totalBalance: 12,
            totalCapacity: 20,
          },
          combined: {
            totalBalance: 12,
            totalCapacity: 20,
          },
          plan: "core",
          storage: {
            limitBytes: 2048,
            remainingBytes: 1536,
            usedBytes: 512,
          },
        } as never,
        true
      )
    ).toEqual({
      billingErrorMessage: null,
      billingLoadFailed: false,
      billingLoading: false,
      billingStatus: null,
      billingUsage: expect.objectContaining({
        plan: "core",
      }),
    });

    expect(
      createBillingUsageLoadFailureState(new Error("usage offline"), true)
    ).toEqual({
      billingErrorMessage: "usage offline",
      billingLoadFailed: true,
      billingLoading: false,
      billingStatus: "usage offline",
      billingUsage: null,
    });
    expect(createBillingUsageLoadFailureState("boom", false)).toEqual({
      billingErrorMessage: "Unable to load billing usage.",
      billingLoadFailed: true,
      billingLoading: false,
      billingStatus: undefined,
      billingUsage: null,
    });
  });

  it("derives billing meters and paid-plan state from loaded usage", () => {
    const usage = {
      chat: {
        refillAt: "2026-05-20T00:00:00.000Z",
        totalBalance: 1200,
        totalCapacity: 2000,
      },
      combined: {
        totalBalance: 1200,
        totalCapacity: 2000,
      },
      plan: "core",
      storage: {
        limitBytes: 10_240,
        remainingBytes: 2048,
        usedBytes: 8192,
      },
    } as never;

    expect(createSettingsBillingMeters(usage)).toEqual([
      {
        kind: "credits",
        label: "Method credits",
        refillAt: "2026-05-20T00:00:00.000Z",
        remaining: 1200,
        total: 2000,
      },
      {
        kind: "storage",
        label: "Storage",
        remaining: 2048,
        total: 10_240,
        used: 8192,
      },
    ]);
    expect(createSettingsBillingMeters(null)).toEqual([]);
    expect(hasSettingsPaidPlan(usage)).toBe(true);
    expect(hasSettingsPaidPlan({ plan: "access" } as never)).toBe(false);
  });

  it("resolves billing portal error copy explicitly", () => {
    expect(resolveManageBillingStatus(new Error("portal down"))).toBe(
      "portal down"
    );
    expect(resolveManageBillingStatus("boom")).toBe(
      "Unable to open billing portal."
    );
  });
});
