import { Effect, Exit, Layer } from "effect-v4";
import { beforeEach, describe, expect, it } from "vitest";
import {
  authorizeInternalBillingRequest,
  BillingRepository,
  InternalBillingAuthorizationLive,
  PolarProvider,
  reconcileBillingConsumption,
  synchronizePendingBillingUsage,
} from "./billing";

describe("billing Effect services", () => {
  beforeEach(() => {
    process.env.BILLING_SYNC_SECRET = "service-secret";
  });

  it("keeps scheduler authorization in a replaceable request service", async () => {
    const authorized = await Effect.runPromise(
      authorizeInternalBillingRequest(
        new Request("http://localhost/internal", {
          headers: { authorization: "Bearer service-secret" },
        })
      ).pipe(Effect.provide(InternalBillingAuthorizationLive))
    );
    expect(authorized).toBeUndefined();

    const unauthorized = await Effect.runPromiseExit(
      authorizeInternalBillingRequest(
        new Request("http://localhost/internal")
      ).pipe(Effect.provide(InternalBillingAuthorizationLive))
    );
    expect(Exit.isFailure(unauthorized)).toBe(true);
  });

  it("substitutes the billing repository at the workflow boundary", async () => {
    const repository = Layer.succeed(BillingRepository)({
      deliverPendingUsage: () => Effect.succeed({ delivered: 3, failed: 1 }),
    });

    await expect(
      Effect.runPromise(
        synchronizePendingBillingUsage(25).pipe(Effect.provide(repository))
      )
    ).resolves.toEqual({ delivered: 3, failed: 1 });
  });

  it("substitutes the Polar provider for deterministic reconciliation", async () => {
    const polar = Layer.succeed(PolarProvider)({
      reconcileConsumption: () =>
        Effect.succeed({
          diverged: false,
          divergenceRatio: 0,
          localConsumedUnits: 40,
          polarConsumedUnits: 40,
        }),
    });

    await expect(
      Effect.runPromise(
        reconcileBillingConsumption("user-id").pipe(Effect.provide(polar))
      )
    ).resolves.toEqual({
      diverged: false,
      divergenceRatio: 0,
      localConsumedUnits: 40,
      polarConsumedUnits: 40,
    });
  });
});
