import {
  type BillingFeature,
  type BillingPlan,
  canStoreBytesForUser,
  consumeUsageUnits,
  findUserIdByPolarCustomerId,
  getBillingSubscriptionByUserId,
  getUsageOverview,
  restoreUsageUnits,
  upsertBillingCustomer,
  upsertBillingSubscription,
  userHasBillingFeature,
} from "@avenire/database";
import {
  ensurePolarCustomer,
  getActiveSubscriptionForExternalCustomer,
  mapProductIdToPlan,
} from "@avenire/payments";

export { getUsageOverview as getUserUsageOverview } from "@avenire/database";
export { applyPolarWebhookEvent } from "@/lib/billing-webhook";

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

export async function hasBillingFeature(
  userId: string,
  feature: BillingFeature
) {
  return userHasBillingFeature(userId, feature);
}

export async function ensureUserBillingRecords(input: {
  userId: string;
  email: string;
  name?: string | null;
}) {
  const customer = await ensurePolarCustomer(input);

  await upsertBillingCustomer({
    userId: input.userId,
    polarCustomerId: customer.id,
    email: customer.email ?? input.email,
  });

  const activeSubscription = await syncUserBillingFromPolar(input.userId);
  if (!activeSubscription) {
    await upsertBillingSubscription({
      userId: input.userId,
      plan: "access",
      status: "inactive",
      polarSubscriptionId: null,
      polarProductId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
    });
  }

  return { activeSubscription, customer };
}

export async function syncUserBillingFromPolar(userId: string) {
  if (!process.env.POLAR_ACCESS_TOKEN?.trim()) {
    console.warn("[billing] skipped Polar subscription sync: missing token", {
      polarServer: process.env.POLAR_SERVER ?? null,
      userId,
    });
    return null;
  }

  let activeSubscription: Awaited<
    ReturnType<typeof getActiveSubscriptionForExternalCustomer>
  >;

  try {
    console.info("[billing] syncing Polar subscription state", {
      polarServer: process.env.POLAR_SERVER ?? null,
      userId,
    });
    activeSubscription = await getActiveSubscriptionForExternalCustomer(userId);
  } catch (error) {
    console.warn("[billing] unable to sync Polar subscription state", {
      error,
      polarServer: process.env.POLAR_SERVER ?? null,
      userId,
    });
    return null;
  }

  if (!activeSubscription) {
    console.info("[billing] no active Polar subscription found", { userId });
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

  console.info("[billing] active Polar subscription found", {
    plan,
    productId: activeSubscription.productId,
    status: activeSubscription.status,
    subscriptionId: activeSubscription.id,
    userId,
  });

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

export { findUserIdByPolarCustomerId, getUsageOverview, toBillingPlan };
