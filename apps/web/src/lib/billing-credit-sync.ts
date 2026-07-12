import {
  getPolarCustomerMeter,
  ingestPolarUsageEvents,
} from "@avenire/payments";
import {
  claimPendingBillingUsageEvents,
  getLocalDeliveredUsageTotal,
  markBillingUsageEventDelivered,
  markBillingUsageEventFailed,
} from "@/lib/database-billing";
import { requirePolarCreditConfiguration } from "@/lib/billing-credit-policy";

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function deliverPendingPolarUsageEvents(limit = 50) {
  const { eventName } = requirePolarCreditConfiguration();
  const events = await claimPendingBillingUsageEvents({ limit });
  if (events.length === 0) {
    return { delivered: 0, failed: 0 };
  }

  try {
    await ingestPolarUsageEvents({
      eventName,
      events: events.map((event) => ({
        externalCustomerId: event.userId,
        externalId: event.idempotencyKey,
        meter: event.meter,
        occurredAt: event.occurredAt,
        units: event.units,
      })),
    });
  } catch (error) {
    const message = toErrorMessage(error);
    await Promise.all(
      events.map((event) =>
        markBillingUsageEventFailed({
          id: event.id,
          attempts: event.attempts,
          error: message,
        })
      )
    );
    return { delivered: 0, failed: events.length };
  }

  const deliveryMarks = await Promise.allSettled(
    events.map((event) => markBillingUsageEventDelivered(event.id))
  );
  const failed = deliveryMarks.filter(
    (result) => result.status === "rejected"
  ).length;
  return { delivered: events.length - failed, failed };
}

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

export async function reconcilePolarCreditConsumption(userId: string) {
  const { divergenceThresholdRatio, meterId, mode } =
    requirePolarCreditConfiguration();
  const [localConsumedUnits, customerMeter] = await Promise.all([
    getLocalDeliveredUsageTotal({ userId, meter: "chat" }),
    getPolarCustomerMeter({ externalCustomerId: userId, meterId }),
  ]);
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
}
