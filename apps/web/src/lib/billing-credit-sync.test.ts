import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  claimPendingBillingUsageEvents: vi.fn(),
  getLocalDeliveredUsageTotal: vi.fn(),
  markBillingUsageEventDelivered: vi.fn(),
  markBillingUsageEventFailed: vi.fn(),
}));
const payments = vi.hoisted(() => ({
  getPolarCustomerMeter: vi.fn(),
  ingestPolarUsageEvents: vi.fn(),
}));

vi.mock("@/lib/database-billing", () => database);
vi.mock("@avenire/payments", () => payments);

import {
  compareCreditConsumption,
  deliverPendingPolarUsageEvents,
  reconcilePolarCreditConsumption,
} from "./billing-credit-sync";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.POLAR_CREDITS_EVENT_NAME = "credits.consumed";
  process.env.POLAR_CREDITS_METER_ID = "meter-id";
  process.env.POLAR_CREDITS_MODE = "shadow";
  delete process.env.POLAR_CREDITS_DIVERGENCE_THRESHOLD_RATIO;
});

describe("compareCreditConsumption", () => {
  it("accepts balances within the one percent shadow threshold", () => {
    expect(
      compareCreditConsumption({
        localConsumedUnits: 1000,
        polarConsumedUnits: 991,
      })
    ).toMatchObject({ diverged: false, divergenceRatio: 0.009 });
  });

  it("flags injected local and Polar divergence", () => {
    expect(
      compareCreditConsumption({
        localConsumedUnits: 100,
        polarConsumedUnits: 95,
      })
    ).toMatchObject({ diverged: true, divergenceRatio: 0.05 });
  });

  it("delivers stable idempotency keys and only marks accepted events delivered", async () => {
    const occurredAt = new Date("2026-07-12T12:00:00.000Z");
    database.claimPendingBillingUsageEvents.mockResolvedValue([
      {
        attempts: 0,
        id: "event-id",
        idempotencyKey: "usage:event-id",
        meter: "chat",
        occurredAt,
        units: 1,
        userId: "user-id",
      },
    ]);
    payments.ingestPolarUsageEvents.mockResolvedValue(undefined);
    database.markBillingUsageEventDelivered.mockResolvedValue(undefined);

    await expect(deliverPendingPolarUsageEvents()).resolves.toEqual({
      delivered: 1,
      failed: 0,
    });
    expect(payments.ingestPolarUsageEvents).toHaveBeenCalledWith({
      eventName: "credits.consumed",
      events: [
        {
          externalCustomerId: "user-id",
          externalId: "usage:event-id",
          meter: "chat",
          occurredAt,
          units: 1,
        },
      ],
    });
    expect(database.markBillingUsageEventDelivered).toHaveBeenCalledWith(
      "event-id"
    );
  });

  it("keeps failed Polar events pending with retry metadata", async () => {
    database.claimPendingBillingUsageEvents.mockResolvedValue([
      {
        attempts: 3,
        id: "event-id",
        idempotencyKey: "usage:event-id",
        meter: "chat",
        occurredAt: new Date("2026-07-12T12:00:00.000Z"),
        units: 1,
        userId: "user-id",
      },
    ]);
    payments.ingestPolarUsageEvents.mockRejectedValue(
      new Error("Polar unavailable")
    );
    database.markBillingUsageEventFailed.mockResolvedValue(undefined);

    await expect(deliverPendingPolarUsageEvents()).resolves.toEqual({
      delivered: 0,
      failed: 1,
    });
    expect(database.markBillingUsageEventFailed).toHaveBeenCalledWith({
      attempts: 3,
      error: "Polar unavailable",
      id: "event-id",
    });
    expect(database.markBillingUsageEventDelivered).not.toHaveBeenCalled();
  });

  it("reconciles the local delivered total against Polar with the configured threshold", async () => {
    process.env.POLAR_CREDITS_DIVERGENCE_THRESHOLD_RATIO = "0.1";
    database.getLocalDeliveredUsageTotal.mockResolvedValue(100);
    payments.getPolarCustomerMeter.mockResolvedValue({ consumedUnits: 92 });

    await expect(reconcilePolarCreditConsumption("user-id")).resolves.toEqual({
      diverged: false,
      divergenceRatio: 0.08,
      localConsumedUnits: 100,
      polarConsumedUnits: 92,
    });
  });
});
