import {
  getPolarCustomerMeter,
  ingestPolarUsageEvents,
} from "@avenire/payments";
import { Effect } from "effect-v4";
import { requirePolarCreditConfiguration } from "@/lib/billing-credit-policy";
import {
  claimPendingBillingUsageEvents,
  getLocalDeliveredUsageTotal,
  markBillingUsageEventDelivered,
  markBillingUsageEventFailed,
} from "@/lib/database-billing";
import {
  DatabaseOperationError,
  ProviderOperationError,
} from "@/lib/effect-errors/external-operation-errors";

export const deliverPendingPolarUsageEvents = Effect.fn(
  "billing.deliverPendingPolarUsageEvents"
)(function* (limit = 50) {
  const { eventName } = yield* Effect.try({
    try: () => requirePolarCreditConfiguration(),
    catch: (cause) =>
      ProviderOperationError.make({
        cause,
        operation: "polar.readConfiguration",
        retryable: false,
      }),
  });
  const events = yield* Effect.tryPromise({
    try: () => claimPendingBillingUsageEvents({ limit }),
    catch: (cause) =>
      DatabaseOperationError.make({
        cause,
        operation: "billing.claimPendingUsageEvents",
        retryable: true,
      }),
  });
  if (events.length === 0) {
    return { delivered: 0, failed: 0 };
  }

  const deliveredToPolar = yield* Effect.tryPromise({
    try: () =>
      ingestPolarUsageEvents({
        eventName,
        events: events.map((event) => ({
          externalCustomerId: event.userId,
          externalId: event.idempotencyKey,
          meter: event.meter,
          occurredAt: event.occurredAt,
          units: event.units,
        })),
      }),
    catch: (cause) =>
      ProviderOperationError.make({
        cause,
        operation: "polar.ingestUsageEvents",
        retryable: true,
      }),
  }).pipe(
    Effect.as(true),
    Effect.catchTag("ProviderOperationError", () =>
      Effect.tryPromise({
        try: () =>
          Promise.all(
            events.map((event) =>
              markBillingUsageEventFailed({
                id: event.id,
                attempts: event.attempts,
                error: "Polar usage delivery failed",
              })
            )
          ),
        catch: (cause) =>
          DatabaseOperationError.make({
            cause,
            operation: "billing.markUsageEventsFailed",
            retryable: true,
          }),
      }).pipe(Effect.as(false))
    )
  );
  if (!deliveredToPolar) {
    return { delivered: 0, failed: events.length };
  }

  const deliveryMarks = yield* Effect.promise(() =>
    Promise.allSettled(
      events.map((event) => markBillingUsageEventDelivered(event.id))
    )
  );
  const failed = deliveryMarks.filter(
    (result) => result.status === "rejected"
  ).length;
  return { delivered: events.length - failed, failed };
});

export interface CreditReconciliation {
  diverged: boolean;
  divergenceRatio: number;
  localConsumedUnits: number;
  polarConsumedUnits: number;
}

export function compareCreditConsumption(input: {
  localConsumedUnits: number;
  polarConsumedUnits: number;
  thresholdRatio?: number;
}): CreditReconciliation {
  const localConsumedUnits = Math.max(0, input.localConsumedUnits);
  const polarConsumedUnits = Math.max(0, input.polarConsumedUnits);
  const denominator = Math.max(1, localConsumedUnits, polarConsumedUnits);
  const divergenceRatio =
    Math.abs(localConsumedUnits - polarConsumedUnits) / denominator;
  return {
    diverged: divergenceRatio > (input.thresholdRatio ?? 0.01),
    divergenceRatio,
    localConsumedUnits,
    polarConsumedUnits,
  };
}

export const reconcilePolarCreditConsumption = Effect.fn(
  "billing.reconcilePolarCreditConsumption"
)(function* (userId: string) {
  const { divergenceThresholdRatio, meterId, mode } = yield* Effect.try({
    try: () => requirePolarCreditConfiguration(),
    catch: (cause) =>
      ProviderOperationError.make({
        cause,
        operation: "polar.readConfiguration",
        retryable: false,
      }),
  });
  const localConsumedUnits = yield* Effect.tryPromise({
    try: () => getLocalDeliveredUsageTotal({ userId, meter: "chat" }),
    catch: (cause) =>
      DatabaseOperationError.make({
        cause,
        operation: "billing.getLocalDeliveredUsageTotal",
        retryable: true,
      }),
  });
  const customerMeter = yield* Effect.tryPromise({
    try: () => getPolarCustomerMeter({ externalCustomerId: userId, meterId }),
    catch: (cause) =>
      ProviderOperationError.make({
        cause,
        operation: "polar.getCustomerMeter",
        retryable: true,
      }),
  });
  const result = compareCreditConsumption({
    localConsumedUnits,
    polarConsumedUnits: customerMeter?.consumedUnits ?? 0,
    thresholdRatio: divergenceThresholdRatio,
  });
  if (result.diverged) {
    console.error("[billing] Polar credit shadow balance diverged", {
      userId,
      meterId,
      mode,
      ...result,
    });
  }
  return result;
});
