import { Effect } from "effect-v4";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createApiLogger: vi.fn(),
  reconcile: vi.fn(),
}));

vi.mock("@/lib/observability", () => ({
  createApiLogger: mocks.createApiLogger,
}));
vi.mock("@/lib/billing-credit-sync", () => ({
  reconcilePolarCreditConsumption: mocks.reconcile,
}));

import { POST } from "./route";

describe("billing credit reconciliation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BILLING_SYNC_SECRET = "sync-secret";
    mocks.createApiLogger.mockReturnValue({
      requestFailed: vi.fn(),
      requestStarted: vi.fn(),
      requestSucceeded: vi.fn(),
    });
  });

  it("rejects unauthenticated reconciliation", async () => {
    const response = await POST(
      new Request(
        "http://localhost/api/internal/billing/credits/reconcile?userId=user-id",
        {
          method: "POST",
        }
      )
    );
    expect(response.status).toBe(401);
    expect(mocks.reconcile).not.toHaveBeenCalled();
  });

  it("returns a conflict so schedulers alert on divergence", async () => {
    mocks.reconcile.mockReturnValue(
      Effect.succeed({
        diverged: true,
        divergenceRatio: 0.05,
        localConsumedUnits: 100,
        polarConsumedUnits: 95,
      })
    );
    const response = await POST(
      new Request(
        "http://localhost/api/internal/billing/credits/reconcile?userId=user-id",
        {
          headers: { authorization: "Bearer sync-secret" },
          method: "POST",
        }
      )
    );
    expect(response.status).toBe(409);
    expect(mocks.reconcile).toHaveBeenCalledWith("user-id");
  });
});
