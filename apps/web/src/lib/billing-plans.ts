export type BillingPlanKey = "access" | "core" | "scholar";
export type PaidBillingPlanKey = Exclude<BillingPlanKey, "access">;
export type BillingCycle = "monthly" | "yearly";

export const BILLING_SETTINGS_PATH =
  "/workspace?overlay=settings&settingsTab=billing";

export const BILLING_PLANS: Record<
  BillingPlanKey,
  {
    chatCredits: string;
    features: string[];
    label: string;
    monthly: number;
    rank: number;
    storage: string;
    yearly: number;
  }
> = {
  access: {
    chatCredits: "220",
    features: ["220 chat credits", "2 GB storage", "Basic models only"],
    label: "Free",
    monthly: 0,
    rank: 0,
    storage: "2 GB",
    yearly: 0,
  },
  core: {
    chatCredits: "1,880",
    features: [
      "1,880 chat credits",
      "50 GB storage",
      "Access to all models",
      "File uploads and web search",
    ],
    label: "Core",
    monthly: 450,
    rank: 1,
    storage: "50 GB",
    yearly: 4000,
  },
  scholar: {
    chatCredits: "6,680",
    features: [
      "6,680 chat credits",
      "75 GB storage",
      "Includes everything in Core",
      "Priority support",
    ],
    label: "Scholar",
    monthly: 1350,
    rank: 2,
    storage: "75 GB",
    yearly: 12_000,
  },
};

export function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

export function getYearlyDiscountPercent(plan: PaidBillingPlanKey) {
  const details = BILLING_PLANS[plan];
  const monthlyYear = details.monthly * 12;
  if (!monthlyYear) {
    return 0;
  }

  return Math.round((1 - details.yearly / monthlyYear) * 100);
}

export function canUpgradePlan(
  currentPlan: BillingPlanKey | null | undefined,
  targetPlan: BillingPlanKey
) {
  const currentRank = BILLING_PLANS[currentPlan ?? "access"].rank;
  return BILLING_PLANS[targetPlan].rank > currentRank;
}
