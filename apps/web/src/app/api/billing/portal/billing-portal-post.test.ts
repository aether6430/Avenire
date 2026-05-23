import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createApiLoggerMock,
  createCustomerPortalLinkForExternalCustomerMock,
  createCustomerPortalLinkMock,
  ensureUserBillingRecordsMock,
  getBillingCustomerByUserIdMock,
  getSessionMock,
  headersMock,
  loggerStub,
} = vi.hoisted(() => ({
  createApiLoggerMock: vi.fn(),
  createCustomerPortalLinkForExternalCustomerMock: vi.fn(),
  createCustomerPortalLinkMock: vi.fn(),
  ensureUserBillingRecordsMock: vi.fn(),
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
  createCustomerPortalLinkForExternalCustomer:
    createCustomerPortalLinkForExternalCustomerMock,
  createCustomerPortalLink: createCustomerPortalLinkMock,
}));

vi.mock("@/lib/billing", () => ({
  ensureUserBillingRecords: ensureUserBillingRecordsMock,
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
        email: "ada@example.com",
        id: "user-1",
        name: "Ada",
      },
    });
    ensureUserBillingRecordsMock.mockResolvedValue({
      activeSubscription: null,
      customer: { id: "polar-1" },
    });
    getBillingCustomerByUserIdMock.mockResolvedValue({
      polarCustomerId: "polar-1",
    });
    createCustomerPortalLinkMock.mockResolvedValue({
      customerPortalUrl: "https://billing.polar.sh/portal/123",
    });
    createCustomerPortalLinkForExternalCustomerMock.mockResolvedValue({
      customerPortalUrl: "https://billing.polar.sh/portal/external",
    });
  });

  it("rejects unauthorized users", async () => {
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
      "http://localhost:3000/workspace?overlay=settings&settingsTab=billing"
    );
    expect(ensureUserBillingRecordsMock).toHaveBeenCalledWith({
      email: "ada@example.com",
      name: "Ada",
      userId: "user-1",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: "https://billing.polar.sh/portal/123",
    });
    expect(loggerStub.requestSucceeded).toHaveBeenCalledWith(200);
  });

  it("falls back to the ensured Polar customer id before using an external-customer portal session", async () => {
    getBillingCustomerByUserIdMock.mockResolvedValueOnce(null);

    const response = await handleBillingPortalPost(
      new Request("https://avenire.space/api/billing/portal", {
        method: "POST",
      })
    );

    expect(createCustomerPortalLinkMock).toHaveBeenCalledWith(
      "polar-1",
      "http://localhost:3000/workspace?overlay=settings&settingsTab=billing"
    );
    expect(
      createCustomerPortalLinkForExternalCustomerMock
    ).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: "https://billing.polar.sh/portal/123",
    });
  });

  it("still falls back to an external-customer portal session when neither stored nor ensured customer ids are usable", async () => {
    ensureUserBillingRecordsMock.mockResolvedValueOnce({
      activeSubscription: null,
      customer: { id: "" },
    });
    getBillingCustomerByUserIdMock.mockResolvedValueOnce(null);

    const response = await handleBillingPortalPost(
      new Request("https://avenire.space/api/billing/portal", {
        method: "POST",
      })
    );

    expect(
      createCustomerPortalLinkForExternalCustomerMock
    ).toHaveBeenCalledWith(
      "user-1",
      "http://localhost:3000/workspace?overlay=settings&settingsTab=billing"
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: "https://billing.polar.sh/portal/external",
    });
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
      "http://localhost:3000/workspace?overlay=settings&settingsTab=billing"
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

  it("fails closed when the real portal route wrapper sees a delegated throw", async () => {
    vi.resetModules();

    const handleBillingPortalPostMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("portal auth offline"));

    vi.doMock("./billing-portal-post", () => ({
      handleBillingPortalPost: handleBillingPortalPostMock,
    }));

    try {
      const { POST } = await import("./route");

      const response = await POST(
        new Request("https://avenire.space/api/billing/portal", {
          method: "POST",
        })
      );

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "portal auth offline",
      });
      expect(handleBillingPortalPostMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.doUnmock("./billing-portal-post");
      vi.resetModules();
    }
  });

  it("delegates through the real portal route wrapper when the handler succeeds", async () => {
    vi.resetModules();

    const handleBillingPortalPostMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ url: "https://billing.polar.sh/portal/123" })
      );

    vi.doMock("./billing-portal-post", () => ({
      handleBillingPortalPost: handleBillingPortalPostMock,
    }));

    try {
      const { POST } = await import("./route");
      const request = new Request("https://avenire.space/api/billing/portal", {
        method: "POST",
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        url: "https://billing.polar.sh/portal/123",
      });
      expect(handleBillingPortalPostMock).toHaveBeenCalledWith(request);
    } finally {
      vi.doUnmock("./billing-portal-post");
      vi.resetModules();
    }
  });
});
