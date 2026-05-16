import type { BillingPeriod, PaidPlan } from "@avenire/payments/plans";
import { DEFAULT_SETTINGS_BILLING_RETURN_PATH } from "@/lib/settings-overlay-route";

const BILLING_PERIODS: BillingPeriod[] = ["monthly", "yearly"];
const PAID_PLANS: PaidPlan[] = ["core", "scholar"];

function isBillingPeriod(value: string | null): value is BillingPeriod {
  return Boolean(value && BILLING_PERIODS.includes(value as BillingPeriod));
}

function isPaidPlan(value: string | null): value is PaidPlan {
  return Boolean(value && PAID_PLANS.includes(value as PaidPlan));
}

export function resolveBillingAppBaseUrl(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
}

export function resolveCheckoutSelection(request: Request) {
  const { searchParams } = new URL(request.url);
  const plan = searchParams.get("plan");
  const billing = searchParams.get("billing");

  if (!(isPaidPlan(plan) && isBillingPeriod(billing))) {
    return null;
  }

  return { billing, plan };
}

export function resolvePortalReturnPath(value: unknown) {
  return typeof value === "string" && value.startsWith("/")
    ? value
    : DEFAULT_SETTINGS_BILLING_RETURN_PATH;
}
