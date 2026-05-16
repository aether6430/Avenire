import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createApiLoggerMock,
  createCheckoutSessionMock,
  getSessionMock,
  headersMock,
} = vi.hoisted(() => ({
  createApiLoggerMock: vi.fn(),
  createCheckoutSessionMock: vi.fn(),
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
    getSessionMock.mockReset();
    headersMock.mockReset();

    createApiLoggerMock.mockReturnValue(createApiLoggerStub());
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
      "http://localhost:3003/login"
    );
    expect(createCheckoutSessionMock).not.toHaveBeenCalled();
  });

  it("redirects invalid selections back to pricing", async () => {
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
      "http://localhost:3003/pricing"
    );
    expect(createCheckoutSessionMock).not.toHaveBeenCalled();
  });

  it("keeps checkout success returning to the live workspace billing overlay", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        email: "ada@example.com",
        id: "user-1",
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
      returnUrl: "http://localhost:3003/pricing",
      successUrl:
        "http://localhost:3003/workspace?overlay=settings&settingsTab=billing&checkout=success",
      userId: "user-1",
    });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://checkout.example/session"
    );
  });
});
