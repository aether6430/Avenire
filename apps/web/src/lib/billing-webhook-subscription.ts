import {
  findUserIdByPolarCustomerId,
  getBillingSubscriptionByUserId,
  upsertBillingCustomer,
  upsertBillingSubscription,
} from "@avenire/database";
import { mapProductIdToPlan } from "@avenire/payments/plans";
import {
  getEventString,
  getMetadata,
  toBillingPlan,
  toPaidPlanOrNull,
} from "@/lib/billing-webhook-shared";

export async function applyPolarSubscriptionWebhookEvent(event: {
  type: string;
  data?: Record<string, unknown>;
}) {
  const data = event.data ?? {};
  const metadata = getMetadata(data);
  const customerObject =
    data.customer && typeof data.customer === "object"
      ? (data.customer as Record<string, unknown>)
      : null;
  const productObject =
    data.product && typeof data.product === "object"
      ? (data.product as Record<string, unknown>)
      : null;

  const customerId =
    getEventString(data, ["customerId", "customer_id"]) ??
    (customerObject ? getEventString(customerObject, ["id"]) : null);
  const metadataUserId =
    getEventString(metadata, ["userId", "user_id"]) ??
    getEventString(data, ["externalCustomerId", "external_customer_id"]);
  const mappedUserId = customerId
    ? await findUserIdByPolarCustomerId(customerId)
    : null;
  const userId = metadataUserId ?? mappedUserId;

  if (!userId) {
    return;
  }

  if (customerId) {
    await upsertBillingCustomer({
      userId,
      polarCustomerId: customerId,
      email: null,
    });
  }

  const existing = await getBillingSubscriptionByUserId(userId);
  const productId =
    getEventString(data, ["productId", "product_id"]) ??
    (productObject ? getEventString(productObject, ["id"]) : null);
  const mappedPlan = mapProductIdToPlan(productId);
  const metadataPlan = toPaidPlanOrNull(getEventString(metadata, ["plan"]));
  const plan = mappedPlan ?? metadataPlan ?? toBillingPlan(existing?.plan);

  const currentPeriodStart =
    data.currentPeriodStart ?? data.current_period_start;
  const currentPeriodEnd = data.currentPeriodEnd ?? data.current_period_end;
  const rawStatus =
    getEventString(data, ["status"]) ?? existing?.status ?? "inactive";

  await upsertBillingSubscription({
    userId,
    plan,
    status: rawStatus,
    polarSubscriptionId:
      getEventString(data, ["id", "subscriptionId", "subscription_id"]) ??
      existing?.polarSubscriptionId ??
      null,
    polarProductId: productId,
    currentPeriodStart:
      currentPeriodStart instanceof Date
        ? currentPeriodStart
        : typeof currentPeriodStart === "string"
          ? new Date(currentPeriodStart)
          : (existing?.currentPeriodStart ?? null),
    currentPeriodEnd:
      currentPeriodEnd instanceof Date
        ? currentPeriodEnd
        : typeof currentPeriodEnd === "string"
          ? new Date(currentPeriodEnd)
          : (existing?.currentPeriodEnd ?? null),
  });
}
