import { Effect, Schema } from "effect-v4";
import {
  ApiInvalidRequest,
  ApiUnauthorized,
  ApiUnavailable,
  runApiHandler,
} from "@/lib/effect-handler";
import {
  authorizeInternalBillingRequest,
  BillingServicesLive,
  reconcileBillingConsumption,
} from "@/lib/effect-services/billing";

const reconciliationQuery = Schema.Struct({
  userId: Schema.Trim.check(Schema.isMinLength(1)),
});

class BillingCreditReconciliationResponse extends Schema.Class<BillingCreditReconciliationResponse>(
  "BillingCreditReconciliationResponse"
)({
  diverged: Schema.Boolean,
  divergenceRatio: Schema.Number,
  localConsumedUnits: Schema.Number,
  polarConsumedUnits: Schema.Number,
}) {}

export async function POST(request: Request) {
  const program = Effect.gen(function* () {
    yield* authorizeInternalBillingRequest(request).pipe(
      Effect.mapError(() => ApiUnauthorized.make({ message: "Unauthorized" }))
    );

    const userId = new URL(request.url).searchParams.get("userId") ?? "";
    const parsed = yield* Schema.decodeUnknownEffect(reconciliationQuery)({
      userId,
    }).pipe(
      Effect.mapError(() =>
        ApiInvalidRequest.make({ message: "Invalid userId" })
      )
    );

    return yield* reconcileBillingConsumption(parsed.userId).pipe(
      Effect.mapError(() =>
        ApiUnavailable.make({
          message: "Billing credit reconciliation unavailable",
        })
      )
    );
  }).pipe(Effect.provide(BillingServicesLive));

  return runApiHandler(request, program, {
    feature: "billing",
    route: "/api/internal/billing/credits/reconcile",
    successSchema: BillingCreditReconciliationResponse,
    successStatus: (result) => (result.diverged ? 409 : 200),
    userId: null,
  });
}
