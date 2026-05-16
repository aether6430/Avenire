export async function applyPolarWebhookEvent(event: {
  type: string;
  data?: Record<string, unknown>;
}) {
  if (event.type === "checkout.created" || event.type === "checkout.updated") {
    const { applyPolarCheckoutWebhookEvent } = await import(
      "@/lib/billing-webhook-checkout"
    );
    await applyPolarCheckoutWebhookEvent(event);
    return;
  }

  if (!event.type.startsWith("subscription.")) {
    return;
  }

  const { applyPolarSubscriptionWebhookEvent } = await import(
    "@/lib/billing-webhook-subscription"
  );
  await applyPolarSubscriptionWebhookEvent(event);
}
