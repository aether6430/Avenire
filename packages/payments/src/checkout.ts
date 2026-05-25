import type { BillingPeriod, PaidPlan } from "./plans";
import { getPolarRuntimeServer, polarFetch } from "./polar-client";

function describePolarResponse(status: number, message: string) {
  return {
    message: message || `Polar checkout request failed (${status})`,
    statusCode: status,
  };
}

function logPaymentError(message: string, payload: Record<string, unknown>) {
  const logger = Reflect.get(globalThis, "console") as
    | { error?: (message?: unknown, ...optionalParams: unknown[]) => void }
    | undefined;
  logger?.error?.(message, payload);
}

function getProductId(plan: PaidPlan, billing: BillingPeriod) {
  const key = `${plan}_${billing}` as const;
  const productIds: Record<typeof key, string | undefined> = {
    core_monthly: process.env.POLAR_PRODUCT_ID_CORE_MONTHLY,
    core_yearly: process.env.POLAR_PRODUCT_ID_CORE_YEARLY,
    scholar_monthly: process.env.POLAR_PRODUCT_ID_SCHOLAR_MONTHLY,
    scholar_yearly: process.env.POLAR_PRODUCT_ID_SCHOLAR_YEARLY,
  };

  return productIds[key] ?? "";
}

export async function createCheckoutSession(input: {
  plan: PaidPlan;
  billing: BillingPeriod;
  userId: string;
  email: string;
  successUrl: string;
  returnUrl: string;
}) {
  const productId = getProductId(input.plan, input.billing);
  if (!productId) {
    throw new Error(
      `Missing Polar product id for ${input.plan}/${input.billing}`
    );
  }

  try {
    const response = await polarFetch({
      path: "/v1/checkouts/",
      body: JSON.stringify({
        products: [productId],
        externalCustomerId: input.userId,
        customerEmail: input.email,
        metadata: {
          userId: input.userId,
          plan: input.plan,
          billing: input.billing,
        },
        successUrl: input.successUrl,
        returnUrl: input.returnUrl,
      }),
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      logPaymentError("[payments] failed to create Polar checkout", {
        billing: input.billing,
        error: describePolarResponse(response.status, message),
        plan: input.plan,
        polarServer: getPolarRuntimeServer(),
        productId,
        userId: input.userId,
      });
      const error = Object.assign(
        new Error(
          message || `Polar checkout request failed (${response.status})`
        ),
        { statusCode: response.status }
      );
      throw error;
    }

    return (await response.json()) as {
      url: string;
    };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "statusCode" in error &&
      error.statusCode === 401
    ) {
      throw new Error(
        `Polar authentication failed (401). Check POLAR_ACCESS_TOKEN and POLAR_SERVER (${getPolarRuntimeServer()}).`
      );
    }
    throw error;
  }
}
