import { Effect } from "effect-v4";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createApiLoggerMock, deliverPendingPolarUsageEventsMock } = vi.hoisted(
  () => ({
    createApiLoggerMock: vi.fn(),
    deliverPendingPolarUsageEventsMock: vi.fn(),
  })
);

vi.mock("@/lib/observability", () => ({
  createApiLogger: createApiLoggerMock,
}));
vi.mock("@/lib/billing-credit-sync", () => ({
  deliverPendingPolarUsageEvents: deliverPendingPolarUsageEventsMock,
}));

import { POST } from "./route";

describe("billing credit sync route", () => {
  beforeEach(() => {
    process.env.BILLING_SYNC_SECRET = "sync-secret";
    createApiLoggerMock.mockReturnValue({
      requestFailed: vi.fn(),
      requestStarted: vi.fn(),
      requestSucceeded: vi.fn(),
    });
    deliverPendingPolarUsageEventsMock.mockReset();
    deliverPendingPolarUsageEventsMock.mockReturnValue(
      Effect.succeed({ delivered: 2, failed: 0 })
    );
  });

  it("rejects unauthenticated delivery attempts", async () => {
    const response = await POST(
      new Request("http://localhost/api/internal/billing/credits/sync", {
        method: "POST",
      })
    );
    expect(response.status).toBe(401);
    expect(deliverPendingPolarUsageEventsMock).not.toHaveBeenCalled();
  });

  it("delivers pending outbox events for an authenticated scheduler", async () => {
    const response = await POST(
      new Request("http://localhost/api/internal/billing/credits/sync", {
        headers: { authorization: "Bearer sync-secret" },
        method: "POST",
      })
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ delivered: 2, failed: 0 });
  });

  it("returns 503 when delivery fails", async () => {
    deliverPendingPolarUsageEventsMock.mockReturnValue(
      Effect.fail(new Error("Polar API unavailable"))
    );
    const response = await POST(
      new Request("http://localhost/api/internal/billing/credits/sync", {
        headers: { authorization: "Bearer sync-secret" },
        method: "POST",
      })
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Billing credit synchronization unavailable",
    });
  });
});
