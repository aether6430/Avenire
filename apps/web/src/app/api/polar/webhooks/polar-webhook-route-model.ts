export const POLAR_WEBHOOK_SECRET_MISSING_ERROR =
  "Webhook secret not configured";
export const POLAR_WEBHOOK_INVALID_SIGNATURE_ERROR =
  "Invalid webhook signature";

export function resolvePolarWebhookSecret(
  raw = process.env.POLAR_WEBHOOK_SECRET
) {
  return raw?.trim() ?? "";
}

export function resolvePolarWebhookEventType(event: unknown) {
  return typeof (event as { type?: unknown } | null | undefined)?.type ===
    "string"
    ? ((event as { type: string }).type ?? null)
    : null;
}

export function resolvePolarWebhookRouteError(error: unknown) {
  return {
    error: error instanceof Error ? error.message : "Unknown webhook error",
    status: 500,
  };
}
