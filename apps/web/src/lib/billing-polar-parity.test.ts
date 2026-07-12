import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  canStoreBytesForUser: vi.fn(),
  consumeUsageUnits: vi.fn(),
  findUserIdByPolarCustomerId: vi.fn(),
  getBillingSubscriptionByUserId: vi.fn(),
  getUsageOverview: vi.fn(),
  restoreUsageUnits: vi.fn(),
  upsertBillingCustomer: vi.fn(),
  upsertBillingSubscription: vi.fn(),
  userHasBillingFeature: vi.fn(),
}));
const payments = vi.hoisted(() => ({
  ensurePolarCustomer: vi.fn(),
  getActiveSubscriptionForExternalCustomer: vi.fn(),
  mapProductIdToPlan: vi.fn(),
}));

vi.mock("@/lib/database-billing", () => database);
vi.mock("@avenire/payments", () => payments);

import { applyPolarWebhookEvent, consumeChatUnits } from "./billing";

describe("Polar billing parity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps chat admission entirely local", async () => {
    database.consumeUsageUnits.mockResolvedValue({ ok: true });

    await expect(consumeChatUnits("user-id", 1)).resolves.toEqual({ ok: true });
    expect(database.consumeUsageUnits).toHaveBeenCalledWith({
      meter: "chat",
      units: 1,
      userId: "user-id",
    });
    expect(payments.ensurePolarCustomer).not.toHaveBeenCalled();
    expect(payments.getActiveSubscriptionForExternalCustomer).not.toHaveBeenCalled();
  });

  it("mirrors a Polar renewal period without resetting the local usage path", async () => {
    database.findUserIdByPolarCustomerId.mockResolvedValue("user-id");
    database.getBillingSubscriptionByUserId.mockResolvedValue({
      currentPeriodEnd: new Date("2026-07-01T00:00:00.000Z"),
      currentPeriodStart: new Date("2026-06-01T00:00:00.000Z"),
      plan: "core",
      polarProductId: "product-id",
      polarSubscriptionId: "subscription-id",
      status: "active",
    });
    payments.mapProductIdToPlan.mockReturnValue("core");

    await applyPolarWebhookEvent({
      type: "subscription.updated",
      data: {
        customerId: "customer-id",
        currentPeriodEnd: "2026-08-01T00:00:00.000Z",
        currentPeriodStart: "2026-07-01T00:00:00.000Z",
        id: "subscription-id",
        productId: "product-id",
        status: "active",
      },
    });

    expect(database.upsertBillingSubscription).toHaveBeenCalledWith({
      currentPeriodEnd: new Date("2026-08-01T00:00:00.000Z"),
      currentPeriodStart: new Date("2026-07-01T00:00:00.000Z"),
      plan: "core",
      polarProductId: "product-id",
      polarSubscriptionId: "subscription-id",
      status: "active",
      userId: "user-id",
    });
    expect(database.restoreUsageUnits).not.toHaveBeenCalled();
  });
});
