import {
  getActiveSubscriptionForExternalCustomer,
  mapProductIdToPlan,
} from "@avenire/payments";
import {
  type BillingPlan,
  canStoreBytesForUser,
  consumeUsageUnits,
  findUserIdByPolarCustomerId,
  getBillingSubscriptionByUserId,
  getUsageOverview,
  restoreUsageUnits,
  upsertBillingCustomer,
  upsertBillingSubscription,
} from "@/lib/database-billing";

function toBillingPlan(input: string | null | undefined): BillingPlan {
  if (input === "core" || input === "scholar") {
    return input;
  }
  return "access";
}

function toPaidPlanOrNull(
  input: string | null | undefined
): Exclude<BillingPlan, "access"> | null {
  if (input === "core" || input === "scholar") {
    return input;
  }
  return null;
}

function getEventString(
  source: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return null;
}

function getMetadata(source: Record<string, unknown>) {
  const raw = source.metadata ?? source.customMetadata;
  if (!raw || typeof raw !== "object") {
    return {} as Record<string, unknown>;
  }
  return raw as Record<string, unknown>;
}

export async function consumeChatUnits(userId: string, units = 1) {
  return consumeUsageUnits({ userId, meter: "chat", units });
}

export async function restoreChatUnits(
  userId: string,
  usage: { consumedFromFourHour?: number; consumedFromOverage?: number }
) {
  return restoreUsageUnits({
    userId,
    meter: "chat",
    fourHourUnits: usage.consumedFromFourHour,
    overageUnits: usage.consumedFromOverage,
  });
}

export async function canStoreBytes(userId: string, bytes: number) {
  return canStoreBytesForUser(userId, bytes);
}

export async function getUserUsageOverview(userId: string) {
  await syncUserBillingFromPolar(userId);
  return getUsageOverview(userId);
}

export async function syncUserBillingFromPolar(userId: string) {
  if (!process.env.POLAR_ACCESS_TOKEN?.trim()) {
    return null;
  }

  let activeSubscription: Awaited<
    ReturnType<typeof getActiveSubscriptionForExternalCustomer>
  >;

  try {
    activeSubscription = await getActiveSubscriptionForExternalCustomer(userId);
  } catch (error) {
    console.warn("[billing] unable to sync Polar subscription state", {
      userId,
      error,
    });
    return null;
  }

  if (!activeSubscription) {
    const existing = await getBillingSubscriptionByUserId(userId);
    if (existing && existing.status !== "inactive") {
      await upsertBillingSubscription({
        userId,
        plan: "access",
        status: "inactive",
        polarSubscriptionId: existing.polarSubscriptionId,
        polarProductId: existing.polarProductId,
        currentPeriodStart: existing.currentPeriodStart,
        currentPeriodEnd: existing.currentPeriodEnd,
      });
    }
    return null;
  }

  const plan =
    mapProductIdToPlan(activeSubscription.productId) ??
    toPaidPlanOrNull(String(activeSubscription.metadata?.plan ?? "")) ??
    "core";

  await upsertBillingCustomer({
    userId,
    polarCustomerId: activeSubscription.customerId,
    email:
      typeof activeSubscription.customer?.email === "string"
        ? activeSubscription.customer.email
        : null,
  });
  await upsertBillingSubscription({
    userId,
    plan,
    status: activeSubscription.status,
    polarSubscriptionId: activeSubscription.id,
    polarProductId: activeSubscription.productId,
    currentPeriodStart: activeSubscription.currentPeriodStart,
    currentPeriodEnd: activeSubscription.currentPeriodEnd,
  });

  return activeSubscription;
}

export async function applyPolarWebhookEvent(event: {
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

  if (event.type === "checkout.created" || event.type === "checkout.updated") {
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

    // Some integrations can receive checkout confirmation before subscription events.
    // Apply an optimistic paid plan if metadata is explicit.
    const productId =
      getEventString(data, ["productId", "product_id"]) ??
      (productObject ? getEventString(productObject, ["id"]) : null);
    const mappedPlan = mapProductIdToPlan(productId);
    const metadataPlan = toPaidPlanOrNull(getEventString(metadata, ["plan"]));
    const resolvedPlan = mappedPlan ?? metadataPlan;
    const checkoutStatus =
      getEventString(data, ["status"])?.toLowerCase() ?? "";
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

    return;
  }

  if (!event.type.startsWith("subscription.")) {
    return;
  }

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
