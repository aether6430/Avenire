import { polarFetch } from "./polar-client";

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
    throw new Error(
      message || `Polar portal request failed (${response.status})`
    );
  }

  return (await response.json()) as {
    customerPortalUrl?: string | null;
  };
}
