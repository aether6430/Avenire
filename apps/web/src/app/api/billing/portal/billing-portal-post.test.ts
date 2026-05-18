import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createApiLoggerMock,
  createCustomerPortalLinkMock,
  getBillingCustomerByUserIdMock,
  getSessionMock,
  headersMock,
  loggerStub,
} = vi.hoisted(() => ({
  createApiLoggerMock: vi.fn(),
  createCustomerPortalLinkMock: vi.fn(),
  getBillingCustomerByUserIdMock: vi.fn(),
  getSessionMock: vi.fn(),
  headersMock: vi.fn(),
  loggerStub: {
    featureUsed: vi.fn(),
    requestFailed: vi.fn(),
    requestStarted: vi.fn(),
    requestSucceeded: vi.fn(),
  },
}));

vi.mock("@avenire/auth/server", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@avenire/payments/portal", () => ({
  createCustomerPortalLink: createCustomerPortalLinkMock,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/database-billing-subscriptions", () => ({
  getBillingCustomerByUserId: getBillingCustomerByUserIdMock,
}));

vi.mock("@/lib/observability", () => ({
  createApiLogger: createApiLoggerMock,
}));

import { handleBillingPortalPost } from "./billing-portal-post";

describe("billing portal post", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
    createApiLoggerMock.mockReturnValue(loggerStub);
    getSessionMock.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });
    getBillingCustomerByUserIdMock.mockResolvedValue({
      polarCustomerId: "polar-1",
    });
    createCustomerPortalLinkMock.mockResolvedValue({
      customerPortalUrl: "https://billing.polar.sh/portal/123",
    });
  });

  it("rejects unauthorized users and missing billing customers", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const unauthorized = await handleBillingPortalPost(
      new Request("https://avenire.space/api/billing/portal", {
        method: "POST",
      })
    );
    expect(unauthorized.status).toBe(401);
    await expect(unauthorized.json()).resolves.toEqual({
      error: "Unauthorized",
    });

    getBillingCustomerByUserIdMock.mockResolvedValueOnce(null);
    const missingCustomer = await handleBillingPortalPost(
      new Request("https://avenire.space/api/billing/portal", {
        method: "POST",
      })
    );
    expect(missingCustomer.status).toBe(404);
    await expect(missingCustomer.json()).resolves.toEqual({
      error: "No billing customer found",
    });
  });

  it("creates a billing portal session with a sanitized return path", async () => {
    const response = await handleBillingPortalPost(
      new Request("https://avenire.space/api/billing/portal", {
        body: JSON.stringify({
          returnPath: "/workspace?overlay=settings&settingsTab=billing",
        }),
        method: "POST",
      })
    );

    expect(createCustomerPortalLinkMock).toHaveBeenCalledWith(
      "polar-1",
      "https://avenire.space/workspace?overlay=settings&settingsTab=billing"
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: "https://billing.polar.sh/portal/123",
    });
    expect(loggerStub.requestSucceeded).toHaveBeenCalledWith(200);
  });

  it("fails closed when the portal session has no URL and when the provider throws", async () => {
    createCustomerPortalLinkMock.mockResolvedValueOnce({
      customerPortalUrl: "",
    });
    const emptyUrl = await handleBillingPortalPost(
      new Request("https://avenire.space/api/billing/portal", {
        body: JSON.stringify({
          returnPath: "https://evil.example",
        }),
        method: "POST",
      })
    );
    expect(emptyUrl.status).toBe(500);
    await expect(emptyUrl.json()).resolves.toEqual({
      error: "Unable to create portal session",
    });
    expect(createCustomerPortalLinkMock).toHaveBeenCalledWith(
      "polar-1",
      "https://avenire.space/workspace?overlay=settings&settingsTab=billing"
    );

    createCustomerPortalLinkMock.mockRejectedValueOnce(new Error("polar down"));
    const failed = await handleBillingPortalPost(
      new Request("https://avenire.space/api/billing/portal", {
        method: "POST",
      })
    );
    expect(failed.status).toBe(500);
    await expect(failed.json()).resolves.toEqual({
      error: "Unable to create portal session",
    });
    expect(loggerStub.requestFailed).toHaveBeenCalledWith(
      500,
      expect.any(Error)
    );
  });
});
