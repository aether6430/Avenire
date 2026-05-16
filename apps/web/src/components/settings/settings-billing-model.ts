import { PLAN_LABELS } from "@/components/settings/settings-panel-model";

export function getBillingPlanLabel(input: {
  billingUsagePlan: "access" | "core" | "scholar" | null;
  loadFailed: boolean;
  loading: boolean;
}) {
  if (input.loading) {
    return "Loading plan...";
  }

  if (input.loadFailed) {
    return "Plan unavailable";
  }

  if (input.billingUsagePlan) {
    return PLAN_LABELS[input.billingUsagePlan] ?? "Free Plan";
  }

  return "Free Plan";
}

export function getBillingValueState(input: {
  loadFailed: boolean;
  loading: boolean;
  readyLabel: string;
}) {
  if (input.loading) {
    return {
      label: "Loading...",
      showSpinner: true,
    };
  }

  if (input.loadFailed) {
    return {
      label: "Unavailable",
      showSpinner: false,
    };
  }

  return {
    label: input.readyLabel,
    showSpinner: false,
  };
}
