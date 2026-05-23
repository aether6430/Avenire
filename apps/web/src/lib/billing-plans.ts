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
    chatCredits: "330",
    features: [
      "330 Apollo credits",
      "2 GB storage",
      "Methods, notes, and workspace search",
      "Apollo AI tutor",
      "Interactive concept widgets",
      "Misconception detection",
      "Mindset Sets with spaced repetition",
      "Standard response speed",
    ],
    label: "Access",
    monthly: 0,
    rank: 0,
    storage: "2 GB",
    yearly: 0,
  },
  core: {
    chatCredits: "1,880",
    features: [
      "Everything in Access",
      "1,880 Apollo credits",
      "15 GB storage",
      "Priority response queue",
    ],
    label: "Core",
    monthly: 450,
    rank: 1,
    storage: "15 GB",
    yearly: 4000,
  },
  scholar: {
    chatCredits: "6,680",
    features: [
      "Everything in Core",
      "6,680 Apollo credits",
      "50 GB storage",
      "Mastery tracking & analytics",
      "Custom study plans",
      "Early experimental features",
    ],
    label: "Scholar",
    monthly: 1350,
    rank: 2,
    storage: "50 GB",
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
