import type {
  BillingUsage,
  TabKey,
} from "@/components/settings/settings-panel-model";

export interface BillingMeterLike {
  label: string;
  refillAt: string | null;
  remaining: number;
  total: number;
}

export function shouldLoadInitialBillingUsage(input: {
  currentTab: TabKey;
  billingLoaded: boolean;
}) {
  return input.currentTab === "billing" && !input.billingLoaded;
}

export function shouldPollBillingUsage(input: {
  currentTab: TabKey;
  billingLoaded: boolean;
}) {
  return input.currentTab === "billing" && input.billingLoaded;
}

export function createBillingUsageLoadStartState(showLoading: boolean) {
  return {
    billingLoadFailed: false,
    billingLoading: showLoading,
    billingStatus: showLoading ? "Loading usage..." : null,
  };
}

export function createBillingUsageLoadSuccessState(
  usage: BillingUsage | null,
  showLoading: boolean
) {
  return {
    billingLoadFailed: false,
    billingLoading: false,
    billingStatus: showLoading ? null : undefined,
    billingUsage: usage,
  };
}

export function createBillingUsageLoadFailureState(
  error: unknown,
  showLoading: boolean
) {
  return {
    billingLoadFailed: true,
    billingLoading: false,
    billingStatus: showLoading
      ? error instanceof Error
        ? error.message
        : "Unable to load billing usage."
      : undefined,
    billingUsage: null,
  };
}

export function createSettingsBillingMeters(
  billingUsage: BillingUsage | null
): BillingMeterLike[] {
  if (!billingUsage) {
    return [];
  }

  return [
    {
      label: "Total credits",
      remaining: billingUsage.combined.totalBalance,
      total: billingUsage.combined.totalCapacity,
      refillAt: billingUsage.chat.refillAt ?? billingUsage.upload.refillAt,
    },
    {
      label: "Method credits",
      remaining: billingUsage.chat.totalBalance,
      total: billingUsage.chat.totalCapacity,
      refillAt: billingUsage.chat.refillAt,
    },
    {
      label: "Upload credits",
      remaining: billingUsage.upload.totalBalance,
      total: billingUsage.upload.totalCapacity,
      refillAt: billingUsage.upload.refillAt,
    },
  ];
}

export function hasSettingsPaidPlan(billingUsage: BillingUsage | null) {
  return billingUsage?.plan === "core" || billingUsage?.plan === "scholar";
}

export function resolveManageBillingStatus(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to open billing portal.";
}
