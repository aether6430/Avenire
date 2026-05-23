import { polarFetch } from "./polar-client";

function describePolarResponse(status: number, message: string) {
  return {
    message: message || `Polar portal request failed (${status})`,
    statusCode: status,
  };
}

function logPaymentError(message: string, payload: Record<string, unknown>) {
  const logger = Reflect.get(globalThis, "console") as
    | { error?: (message?: unknown, ...optionalParams: unknown[]) => void }
    | undefined;
  logger?.error?.(message, payload);
}

export async function createCustomerPortalLink(
  customerId: string,
  returnUrl?: string
) {
  const response = await polarFetch({
    path: "/v1/customer-sessions/",
    body: JSON.stringify({
      customerId,
      returnUrl: returnUrl ?? null,
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    logPaymentError("[payments] failed to create Polar customer portal link", {
      customerId,
      error: describePolarResponse(response.status, message),
      hasReturnUrl: Boolean(returnUrl),
    });
    throw new Error(
      message || `Polar portal request failed (${response.status})`
    );
  }

  return (await response.json()) as {
    customerPortalUrl?: string | null;
  };
}

export async function createCustomerPortalLinkForExternalCustomer(
  externalCustomerId: string,
  returnUrl?: string
) {
  const response = await polarFetch({
    path: "/v1/customer-sessions/",
    body: JSON.stringify({
      externalCustomerId,
      returnUrl: returnUrl ?? null,
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    logPaymentError(
      "[payments] failed to create Polar external customer portal link",
      {
        error: describePolarResponse(response.status, message),
        externalCustomerId,
        hasReturnUrl: Boolean(returnUrl),
      }
    );
    throw new Error(
      message || `Polar portal request failed (${response.status})`
    );
  }

  return (await response.json()) as {
    customerPortalUrl?: string | null;
  };
}
