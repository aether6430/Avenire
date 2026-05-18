import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionMock, getUserUsageOverviewMock, headersMock } = vi.hoisted(
  () => ({
    getSessionMock: vi.fn(),
    getUserUsageOverviewMock: vi.fn(),
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

vi.mock("@/lib/billing-usage", () => ({
  getUserUsageOverview: getUserUsageOverviewMock,
}));

import { handleBillingUsageGet } from "./billing-usage-get";

describe("billing usage get", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
    getSessionMock.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });
    getUserUsageOverviewMock.mockResolvedValue({
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
    expect(getUserUsageOverviewMock).not.toHaveBeenCalled();
  });

  it("returns usage for the signed-in user", async () => {
    const response = await handleBillingUsageGet();

    expect(getUserUsageOverviewMock).toHaveBeenCalledWith("user-1");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      usage: {
        currentPeriodCreditsUsed: 12,
      },
    });
  });
});
