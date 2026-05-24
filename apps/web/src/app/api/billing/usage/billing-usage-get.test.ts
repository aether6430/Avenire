import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionMock, getUsageOverviewMock, headersMock } = vi.hoisted(
  () => ({
    getSessionMock: vi.fn(),
    getUsageOverviewMock: vi.fn(),
    headersMock: vi.fn(),
  })
);

vi.mock("@avenire/auth/server", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@avenire/database", () => ({
  getUsageOverview: getUsageOverviewMock,
}));

import { handleBillingUsageGet } from "./billing-usage-get";

const billingUsageRouteFile = resolve(import.meta.dirname, "./route.ts");
const billingUsageGetFile = resolve(
  import.meta.dirname,
  "./billing-usage-get.ts"
);
const billingUsageRouteModelFile = resolve(
  import.meta.dirname,
  "./billing-usage-route-model.ts"
);

describe("billing usage get", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
    getSessionMock.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });
    getUsageOverviewMock.mockResolvedValue({
      currentPeriodCreditsUsed: 12,
    });
  });

  it("rejects unauthorized requests", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const response = await handleBillingUsageGet();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized",
    });
    expect(getUsageOverviewMock).not.toHaveBeenCalled();
  });

  it("fails closed when session lookup throws before usage loading begins", async () => {
    getSessionMock.mockRejectedValueOnce(new Error("billing usage offline"));

    const response = await handleBillingUsageGet();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "billing usage offline",
    });
    expect(getUsageOverviewMock).not.toHaveBeenCalled();
  });

  it("returns usage for the signed-in user", async () => {
    const response = await handleBillingUsageGet();

    expect(getUsageOverviewMock).toHaveBeenCalledWith("user-1");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      usage: {
        currentPeriodCreditsUsed: 12,
      },
    });
  });

  it("fails closed when the real billing usage route wrapper sees a delegated throw", async () => {
    vi.resetModules();

    const handleBillingUsageGetMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("billing usage route offline"));

    vi.doMock("./billing-usage-get", () => ({
      handleBillingUsageGet: handleBillingUsageGetMock,
    }));

    try {
      const { GET } = await import("./route");

      const response = await GET();

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "billing usage route offline",
      });
      expect(handleBillingUsageGetMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.doUnmock("./billing-usage-get");
      vi.resetModules();
    }
  });

  it("delegates through the real billing usage route wrapper when the handler succeeds", async () => {
    vi.resetModules();

    const handleBillingUsageGetMock = vi.fn().mockResolvedValueOnce(
      Response.json({
        usage: {
          currentPeriodCreditsUsed: 12,
        },
      })
    );

    vi.doMock("./billing-usage-get", () => ({
      handleBillingUsageGet: handleBillingUsageGetMock,
    }));

    try {
      const { GET } = await import("./route");

      const response = await GET();

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        usage: {
          currentPeriodCreditsUsed: 12,
        },
      });
      expect(handleBillingUsageGetMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.doUnmock("./billing-usage-get");
      vi.resetModules();
    }
  });

  it("keeps billing usage fallback helpers in the dedicated route model file", () => {
    const routeSource = readFileSync(billingUsageRouteFile, "utf8");
    const billingUsageGetSource = readFileSync(billingUsageGetFile, "utf8");

    expect(routeSource).toContain('from "./billing-usage-route-model"');
    expect(billingUsageGetSource).toContain('from "@avenire/database"');
    expect(billingUsageGetSource).not.toContain("@/lib/billing-usage");
    expect(readFileSync(billingUsageRouteModelFile, "utf8")).toContain(
      'export const BILLING_USAGE_LOAD_ERROR = "Unable to load billing usage."'
    );
  });
});
