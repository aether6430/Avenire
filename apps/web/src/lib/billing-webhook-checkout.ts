import { mapProductIdToPlan } from "@avenire/payments/plans";
import {
  getEventString,
  getMetadata,
  toPaidPlanOrNull,
} from "@/lib/billing-webhook-shared";
import {
  upsertBillingCustomer,
  upsertBillingSubscription,
} from "@/lib/database-billing-subscriptions";

export async function applyPolarCheckoutWebhookEvent(event: {
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

  const userId =
    getEventString(metadata, ["userId", "user_id"]) ??
    getEventString(data, ["externalCustomerId", "external_customer_id"]);
  const customerId =
    getEventString(data, ["customerId", "customer_id"]) ??
    (customerObject ? getEventString(customerObject, ["id"]) : null);
  const email =
    getEventString(data, ["customerEmail", "customer_email"]) ??
    (customerObject ? getEventString(customerObject, ["email"]) : null);

  if (userId && customerId) {
    await upsertBillingCustomer({
      userId,
      polarCustomerId: customerId,
      email,
    });
  }

  const productId =
    getEventString(data, ["productId", "product_id"]) ??
    (productObject ? getEventString(productObject, ["id"]) : null);
  const mappedPlan = mapProductIdToPlan(productId);
  const metadataPlan = toPaidPlanOrNull(getEventString(metadata, ["plan"]));
  const resolvedPlan = mappedPlan ?? metadataPlan;
  const checkoutStatus = getEventString(data, ["status"])?.toLowerCase() ?? "";

  if (
    userId &&
    resolvedPlan &&
    (checkoutStatus === "succeeded" ||
      checkoutStatus === "confirmed" ||
      checkoutStatus === "paid")
  ) {
    await upsertBillingSubscription({
      userId,
      plan: resolvedPlan,
      status: "active",
      polarSubscriptionId: getEventString(data, [
        "subscriptionId",
        "subscription_id",
      ]),
      polarProductId: productId,
      currentPeriodStart: null,
      currentPeriodEnd: null,
    });
  }
}
