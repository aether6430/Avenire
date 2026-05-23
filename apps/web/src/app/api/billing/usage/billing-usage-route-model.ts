export const BILLING_USAGE_LOAD_ERROR = "Unable to load billing usage.";

export function resolveBillingUsageRouteError(
  error: unknown,
  fallback: string
) {
  return error instanceof Error ? error.message : fallback;
}
