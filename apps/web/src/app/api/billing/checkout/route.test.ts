import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createApiLoggerMock,
  createCheckoutSessionMock,
  ensureUserBillingRecordsMock,
  getSessionMock,
  headersMock,
} = vi.hoisted(() => ({
  createApiLoggerMock: vi.fn(),
  createCheckoutSessionMock: vi.fn(),
  ensureUserBillingRecordsMock: vi.fn(),
  getSessionMock: vi.fn(),
  headersMock: vi.fn(),
}));

vi.mock("@avenire/auth/server", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@avenire/payments/checkout", () => ({
  createCheckoutSession: createCheckoutSessionMock,
}));

vi.mock("@/lib/billing", () => ({
  ensureUserBillingRecords: ensureUserBillingRecordsMock,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/observability", () => ({
  createApiLogger: createApiLoggerMock,
}));

import { GET } from "./route";

function createApiLoggerStub() {
  return {
    featureUsed: vi.fn(),
    meter: vi.fn(),
    requestFailed: vi.fn(),
    requestStarted: vi.fn(),
    requestSucceeded: vi.fn(),
  };
}

describe("/api/billing/checkout route", () => {
  beforeEach(() => {
    createApiLoggerMock.mockReset();
    createCheckoutSessionMock.mockReset();
    ensureUserBillingRecordsMock.mockReset();
    getSessionMock.mockReset();
    headersMock.mockReset();

    createApiLoggerMock.mockReturnValue(createApiLoggerStub());
    ensureUserBillingRecordsMock.mockResolvedValue({
      activeSubscription: null,
      customer: { id: "customer-1" },
    });
    headersMock.mockResolvedValue(new Headers());
  });

  it("redirects anonymous users to login", async () => {
    getSessionMock.mockResolvedValue(null);

    const response = await GET(
      new Request(
        "http://localhost:3003/api/billing/checkout?plan=core&billing=monthly"
      )
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login"
    );
    expect(createCheckoutSessionMock).not.toHaveBeenCalled();
  });

  it("fails closed to the billing settings error redirect when checkout session resolution throws before handler fallback logic runs", async () => {
    getSessionMock.mockRejectedValueOnce(new Error("billing auth offline"));

    const response = await GET(
      new Request(
        "http://localhost:3003/api/billing/checkout?plan=core&billing=monthly"
      )
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/workspace?overlay=settings&settingsTab=billing&error=checkout"
    );
    expect(createCheckoutSessionMock).not.toHaveBeenCalled();
  });

  it("redirects invalid selections back to the billing settings overlay", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        email: "ada@example.com",
        id: "user-1",
      },
    });

    const response = await GET(
      new Request(
        "http://localhost:3003/api/billing/checkout?plan=free&billing=monthly"
      )
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/workspace?overlay=settings&settingsTab=billing&error=invalid_checkout"
    );
    expect(createCheckoutSessionMock).not.toHaveBeenCalled();
  });

  it("keeps checkout success returning to the live workspace billing overlay", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        email: "ada@example.com",
        id: "user-1",
        name: "Ada Lovelace",
      },
    });
    createCheckoutSessionMock.mockResolvedValue({
      url: "https://checkout.example/session",
    });

    const response = await GET(
      new Request(
        "http://localhost:3003/api/billing/checkout?plan=core&billing=monthly"
      )
    );

    expect(createCheckoutSessionMock).toHaveBeenCalledWith({
      billing: "monthly",
      email: "ada@example.com",
      plan: "core",
      returnUrl:
        "http://localhost:3000/workspace?overlay=settings&settingsTab=billing",
      successUrl:
        "http://localhost:3000/workspace?overlay=settings&settingsTab=billing&checkout=success",
      userId: "user-1",
    });
    expect(ensureUserBillingRecordsMock).toHaveBeenCalledWith({
      email: "ada@example.com",
      name: "Ada Lovelace",
      userId: "user-1",
    });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://checkout.example/session"
    );
  });

  it("redirects active subscribers back to billing settings instead of opening duplicate checkout", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        email: "ada@example.com",
        id: "user-1",
        name: "Ada Lovelace",
      },
    });
    ensureUserBillingRecordsMock.mockResolvedValueOnce({
      activeSubscription: {
        id: "sub-1",
        productId: "product-core",
        status: "active",
      },
      customer: { id: "customer-1" },
    });

    const response = await GET(
      new Request(
        "http://localhost:3003/api/billing/checkout?plan=core&billing=monthly"
      )
    );

    expect(ensureUserBillingRecordsMock).toHaveBeenCalledWith({
      email: "ada@example.com",
      name: "Ada Lovelace",
      userId: "user-1",
    });
    expect(createCheckoutSessionMock).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/workspace?overlay=settings&settingsTab=billing&billing=active"
    );
  });

  it("keeps failure redirects on the resolved app base URL instead of the request origin", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        email: "ada@example.com",
        id: "user-1",
      },
    });
    createCheckoutSessionMock.mockRejectedValueOnce(new Error("polar down"));

    const response = await GET(
      new Request(
        "http://localhost:3003/api/billing/checkout?plan=core&billing=monthly"
      )
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/workspace?overlay=settings&settingsTab=billing&error=checkout"
    );
  });
});
