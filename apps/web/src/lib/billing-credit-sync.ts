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

function requireShadowConfiguration() {
  if (process.env.POLAR_CREDITS_SHADOW_MODE !== "true") {
    throw new Error("Polar credits shadow mode is disabled");
  }
  const eventName = process.env.POLAR_CREDITS_EVENT_NAME?.trim();
  const meterId = process.env.POLAR_CREDITS_METER_ID?.trim();
  if (!(eventName && meterId)) {
    throw new Error(
      "Polar credits require POLAR_CREDITS_EVENT_NAME and POLAR_CREDITS_METER_ID"
    );
  }
  return { eventName, meterId };
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function deliverPendingPolarUsageEvents(limit = 50) {
  const { eventName } = requireShadowConfiguration();
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
    await Promise.all(
      events.map((event) => markBillingUsageEventDelivered(event.id))
    );
    return { delivered: events.length, failed: 0 };
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
  const { meterId } = requireShadowConfiguration();
  const [localConsumedUnits, customerMeter] = await Promise.all([
    getLocalDeliveredUsageTotal({ userId, meter: "chat" }),
    getPolarCustomerMeter({ externalCustomerId: userId, meterId }),
  ]);
  const result = compareCreditConsumption({
    localConsumedUnits,
    polarConsumedUnits: customerMeter?.consumedUnits ?? 0,
  });
  if (result.diverged) {
    console.error("[billing] Polar credit shadow balance diverged", {
      userId,
      meterId,
      ...result,
    });
  }
  return result;
}
