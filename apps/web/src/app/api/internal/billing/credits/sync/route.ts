import { Effect, Schema } from "effect-v4";
import {
  ApiUnauthorized,
  ApiUnavailable,
  runApiHandler,
} from "@/lib/effect-handler";
import {
  authorizeInternalBillingRequest,
  BillingServicesLive,
  synchronizePendingBillingUsage,
} from "@/lib/effect-services/billing";

class BillingCreditSyncResponse extends Schema.Class<BillingCreditSyncResponse>(
  "BillingCreditSyncResponse"
)({
  delivered: Schema.Number,
  failed: Schema.Number,
}) {}

export async function POST(request: Request) {
  const program = Effect.gen(function* () {
    yield* authorizeInternalBillingRequest(request).pipe(
      Effect.mapError(() => ApiUnauthorized.make({ message: "Unauthorized" }))
    );

    return yield* synchronizePendingBillingUsage().pipe(
      Effect.mapError(() =>
        ApiUnavailable.make({
          message: "Billing credit synchronization unavailable",
        })
      )
    );
  }).pipe(Effect.provide(BillingServicesLive));

  return runApiHandler(request, program, {
    feature: "billing",
    route: "/api/internal/billing/credits/sync",
    successSchema: BillingCreditSyncResponse,
    userId: null,
  });
}
