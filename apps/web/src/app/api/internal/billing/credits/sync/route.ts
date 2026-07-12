import { Effect, Schema } from "effect-v4";
import { deliverPendingPolarUsageEvents } from "@/lib/billing-credit-sync";
import {
  ApiUnauthorized,
  ApiUnavailable,
  runApiHandler,
} from "@/lib/effect-handler";

class BillingCreditSyncResponse extends Schema.Class<BillingCreditSyncResponse>(
  "BillingCreditSyncResponse"
)({
  delivered: Schema.Number,
  failed: Schema.Number,
}) {}

function isAuthorized(request: Request) {
  const secret = (
    process.env.BILLING_SYNC_SECRET ??
    process.env.CRON_SECRET ??
    ""
  ).trim();
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  const program = Effect.gen(function* () {
    if (!isAuthorized(request)) {
      return yield* ApiUnauthorized.make({ message: "Unauthorized" });
    }

    return yield* Effect.tryPromise({
      try: () => deliverPendingPolarUsageEvents(),
      catch: () =>
        ApiUnavailable.make({
          message: "Billing credit synchronization unavailable",
        }),
    });
  });

  return runApiHandler(request, program, {
    feature: "billing",
    route: "/api/internal/billing/credits/sync",
    successSchema: BillingCreditSyncResponse,
    userId: null,
  });
}
