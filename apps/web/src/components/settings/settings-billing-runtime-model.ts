import type {
  BillingUsage,
  TabKey,
} from "@/components/settings/settings-panel-model";

export interface BillingMeterLike {
  kind: "credits" | "storage";
  label: string;
  refillAt?: string | null;
  remaining: number;
  total: number;
  used?: number;
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
    billingErrorMessage: null,
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
    billingErrorMessage: null,
    billingLoadFailed: false,
    billingLoading: false,
    billingStatus: showLoading ? null : undefined,
    billingUsage: usage,
  };
}

function resolveBillingUsageErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to load billing usage.";
}

export function createBillingUsageLoadFailureState(
  error: unknown,
  showLoading: boolean
) {
  const billingErrorMessage = resolveBillingUsageErrorMessage(error);

  return {
    billingErrorMessage,
    billingLoadFailed: true,
    billingLoading: false,
    billingStatus: showLoading ? billingErrorMessage : undefined,
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
      kind: "credits",
      label: "Method credits",
      remaining: billingUsage.chat.totalBalance,
      total: billingUsage.chat.totalCapacity,
      refillAt: billingUsage.chat.refillAt,
    },
    {
      kind: "storage",
      label: "Storage",
      remaining: billingUsage.storage.remainingBytes,
      total: billingUsage.storage.limitBytes,
      used: billingUsage.storage.usedBytes,
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
