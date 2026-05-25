import { authClient } from "@avenire/auth/client";

export type PolarCheckoutPlan = "core" | "scholar";
export type PolarCheckoutBilling = "monthly" | "yearly";

export async function ensurePolarCustomer() {
  const response = await fetch("/api/billing/polar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(payload.error ?? "Unable to prepare Polar customer");
  }
}

export async function startPolarCheckout(
  plan: PolarCheckoutPlan,
  billing: PolarCheckoutBilling = "monthly"
) {
  await ensurePolarCustomer();
  await authClient.checkout({
    slug: `${plan}-${billing}`,
  });
}
