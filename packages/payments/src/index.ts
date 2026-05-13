import { Polar } from "@polar-sh/sdk";
import { WebhookVerificationError, validateEvent } from "@polar-sh/sdk/webhooks";

type PolarServer = "sandbox" | "production";

function describePolarError(error: unknown) {
  if (!error || typeof error !== "object") {
    return { value: error };
  }

  const record = error as Record<string, unknown>;
  return {
    name: record.name,
    message: record.message,
    statusCode: record.statusCode,
    status: record.status,
    code: record.code,
    body: record.body,
  };
}

function getPolarServer(): PolarServer {
  const configured = process.env.POLAR_SERVER;
  if (configured === "sandbox" || configured === "production") {
    return configured;
  }

  return process.env.NODE_ENV === "production" ? "production" : "sandbox";
}

function getPolarAccessToken() {
  const raw = process.env.POLAR_ACCESS_TOKEN ?? "";
  const token = raw.trim().replace(/^['"]|['"]$/g, "");

  if (!token) {
    throw new Error("Missing POLAR_ACCESS_TOKEN");
  }

  return token;
}

function getPolarClient() {
  return new Polar({
    accessToken: getPolarAccessToken(),
    server: getPolarServer(),
  });
}

export type PaidPlan = "core" | "scholar";
export type BillingPeriod = "monthly" | "yearly";

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

export function mapProductIdToPlan(productId?: string | null): PaidPlan | null {
  if (!productId) {
    return null;
  }

  const planByProduct = new Map<string, PaidPlan>();
  const mappings: Array<{ plan: PaidPlan; billing: BillingPeriod }> = [
    { plan: "core", billing: "monthly" },
    { plan: "core", billing: "yearly" },
    { plan: "scholar", billing: "monthly" },
    { plan: "scholar", billing: "yearly" },
  ];

  for (const mapping of mappings) {
    const mappedProduct = getProductId(mapping.plan, mapping.billing);
    if (mappedProduct) {
      planByProduct.set(mappedProduct, mapping.plan);
    }
  }

  return planByProduct.get(productId) ?? null;
}

export async function ensurePolarCustomer(input: {
  userId: string;
  email: string;
  name?: string | null;
}) {
  const polar = getPolarClient();

  try {
    return await polar.customers.getExternal({ externalId: input.userId });
  } catch {
    // Existing users may predate Better Auth's Polar customer creation hook.
  }

  const existingByEmail = await polar.customers.list({
    email: input.email,
    limit: 10,
  });

  for await (const page of existingByEmail) {
    const customer = page.result.items.find(
      (item) => item.email.toLowerCase() === input.email.toLowerCase()
    );

    if (!customer) {
      continue;
    }

    if (customer.externalId && customer.externalId !== input.userId) {
      throw new Error(
        `Polar customer ${customer.id} is already linked to external id ${customer.externalId}`
      );
    }

    if (customer.externalId === input.userId) {
      return customer;
    }

    return polar.customers.update({
      id: customer.id,
      customerUpdate: {
        externalId: input.userId,
        name: input.name ?? customer.name ?? null,
      },
    });
  }

  return polar.customers.create({
    email: input.email,
    externalId: input.userId,
    name: input.name ?? null,
  });
}

export async function getActiveSubscriptionForExternalCustomer(
  externalCustomerId: string,
) {
  const polar = getPolarClient();
  try {
    const result = await polar.subscriptions.list({
      active: true,
      externalCustomerId,
      limit: 10,
      sorting: ["-started_at"],
    });

    for await (const page of result) {
      return page.result.items[0] ?? null;
    }
  } catch (error) {
    console.error("[payments] failed to list Polar subscriptions", {
      externalCustomerId,
      polarServer: getPolarServer(),
      error: describePolarError(error),
    });
    throw error;
  }

  return null;
}

export async function validatePolarWebhook(
  payload: string,
  headers: Record<string, string>,
) {
  return handlePolarWebhook(
    payload,
    headers["polar-signature"] ?? headers["Polar-Signature"] ?? null,
  );
}

export async function handlePolarWebhook(
  payload: string,
  signatureHeader: string | null | undefined,
) {
  const secret = (process.env.POLAR_WEBHOOK_SECRET ?? "").trim();
  const signature = signatureHeader?.trim();

  if (!secret || !signature) {
    return null;
  }

  try {
    return validateEvent(payload, { "polar-signature": signature }, secret);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return null;
    }
    throw error;
  }
}

export async function createCustomerPortalLink(customerId: string, returnUrl?: string) {
  const polar = getPolarClient();
  try {
    return await polar.customerSessions.create({
      customerId,
      returnUrl: returnUrl ?? null,
    });
  } catch (error) {
    console.error("[payments] failed to create Polar customer portal link", {
      customerId,
      hasReturnUrl: Boolean(returnUrl),
      polarServer: getPolarServer(),
      error: describePolarError(error),
    });
    throw error;
  }
}

export async function createCustomerPortalLinkForExternalCustomer(
  externalCustomerId: string,
  returnUrl?: string,
) {
  const polar = getPolarClient();
  try {
    return await polar.customerSessions.create({
      externalCustomerId,
      returnUrl: returnUrl ?? null,
    });
  } catch (error) {
    console.error("[payments] failed to create Polar external customer portal link", {
      externalCustomerId,
      hasReturnUrl: Boolean(returnUrl),
      polarServer: getPolarServer(),
      error: describePolarError(error),
    });
    throw error;
  }
}

export async function createCheckoutSession(input: {
  plan: PaidPlan;
  billing: BillingPeriod;
  userId: string;
  email: string;
  successUrl: string;
  returnUrl: string;
}) {
  const polar = getPolarClient();
  const productId = getProductId(input.plan, input.billing);
  if (!productId) {
    throw new Error(`Missing Polar product id for ${input.plan}/${input.billing}`);
  }

  try {
    return await polar.checkouts.create({
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
    });
  } catch (error) {
    console.error("[payments] failed to create Polar checkout", {
      plan: input.plan,
      billing: input.billing,
      userId: input.userId,
      productId,
      polarServer: getPolarServer(),
      error: describePolarError(error),
    });
    if (
      error &&
      typeof error === "object" &&
      "statusCode" in error &&
      error.statusCode === 401
    ) {
      throw new Error(
        `Polar authentication failed (401). Check POLAR_ACCESS_TOKEN and POLAR_SERVER (${getPolarServer()}).`
      );
    }
    throw error;
  }
}
