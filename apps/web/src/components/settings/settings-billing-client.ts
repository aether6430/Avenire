"use client";

import { authClient } from "@avenire/auth/client";
import type { BillingUsage } from "@/components/settings/settings-panel-model";

function getBillingError(
  payload: { error?: string } | null | undefined,
  fallback: string
) {
  return payload?.error ?? fallback;
}

async function parseJson<T>(response: Response) {
  return (await response.json().catch(() => ({}))) as T;
}

interface PolarCustomerState {
  activeSubscriptions?: Array<{
    amount?: number;
    metadata?: Record<string, string | number | boolean | undefined>;
    productId?: string;
    status?: string;
  }>;
}

type PolarCustomerSubscription = NonNullable<
  PolarCustomerState["activeSubscriptions"]
>[number];

function getActivePolarSubscription(
  state: PolarCustomerState | null | undefined
): PolarCustomerSubscription | null {
  return (
    state?.activeSubscriptions?.find((candidate) => {
      const status = candidate.status?.toLowerCase();
      return status === "active" || status === "trialing";
    }) ?? null
  );
}

function planFromPolarCustomerState(
  state: PolarCustomerState | null | undefined
): BillingUsage["plan"] | null {
  const subscription = getActivePolarSubscription(state);
  if (!subscription) {
    return "access";
  }

  const metadataPlan = subscription.metadata?.plan;
  if (metadataPlan === "core" || metadataPlan === "scholar") {
    return metadataPlan;
  }

  // Product ids need server-side env mapping; avoid guessing in the client.
  if (subscription.productId) {
    return null;
  }

  if (typeof subscription.amount === "number") {
    return subscription.amount >= 5000 ? "scholar" : "core";
  }

  return null;
}

function withBillingPlan(
  usage: BillingUsage,
  plan: BillingUsage["plan"] | null
): BillingUsage {
  if (!(plan && usage.plan !== plan)) {
    return usage;
  }

  return { ...usage, plan };
}

async function loadServerBillingPlan() {
  const response = await fetch("/api/billing/polar", {
    cache: "no-store",
    method: "POST",
  });
  const payload = await parseJson<{
    error?: string;
    plan?: BillingUsage["plan"] | null;
  }>(response);

  if (!response.ok) {
    throw new Error(
      getBillingError(payload, "Unable to load provider billing state.")
    );
  }

  return payload.plan ?? null;
}

export async function loadProviderBillingPlan(): Promise<
  BillingUsage["plan"] | null
> {
  try {
    const providerState = (await authClient.customer.state()) as {
      data?: PolarCustomerState | null;
    };
    const plan = planFromPolarCustomerState(providerState.data);
    return plan ?? loadServerBillingPlan();
  } catch {
    return loadServerBillingPlan();
  }
}

export async function openProviderBillingPortal() {
  await authClient.customer.portal();
}

export async function startProviderCheckout(plan: "core" | "scholar") {
  await authClient.checkout({
    slug: `${plan}-monthly`,
  });
}

export async function loadBillingUsage() {
  const response = await fetch("/api/billing/usage", {
    cache: "no-store",
  });
  const payload = await parseJson<{ error?: string; usage?: BillingUsage }>(
    response
  );

  if (!response.ok) {
    throw new Error(getBillingError(payload, "Unable to load billing usage."));
  }

  const usage = payload.usage ?? null;
  if (!usage) {
    return null;
  }

  try {
    const providerPlan = await loadProviderBillingPlan();
    return withBillingPlan(usage, providerPlan);
  } catch {
    return usage;
  }
}

export async function loadBillingPortalUrl(returnPath: string) {
  const response = await fetch("/api/billing/portal", {
    body: JSON.stringify({ returnPath }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = await parseJson<{ error?: string; url?: string }>(response);

  if (!(response.ok && payload.url)) {
    throw new Error(getBillingError(payload, "Unable to open billing portal."));
  }

  return payload.url;
}
