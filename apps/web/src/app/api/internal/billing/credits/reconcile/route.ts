import { Effect, Schema } from "effect-v4";
import { reconcilePolarCreditConsumption } from "@/lib/billing-credit-sync";
import {
  ApiInvalidRequest,
  ApiUnauthorized,
  ApiUnavailable,
  runApiHandler,
} from "@/lib/effect-handler";

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

    const userId = new URL(request.url).searchParams.get("userId") ?? "";
    const parsed = yield* Schema.decodeUnknownEffect(reconciliationQuery)({
      userId,
    }).pipe(
      Effect.mapError(() =>
        ApiInvalidRequest.make({ message: "Invalid userId" })
      )
    );

    return yield* Effect.tryPromise({
      try: () => reconcilePolarCreditConsumption(parsed.userId),
      catch: () =>
        ApiUnavailable.make({
          message: "Billing credit reconciliation unavailable",
        }),
    });
  });

  return runApiHandler(request, program, {
    feature: "billing",
    route: "/api/internal/billing/credits/reconcile",
    successSchema: BillingCreditReconciliationResponse,
    successStatus: (result) => (result.diverged ? 409 : 200),
    userId: null,
  });
}
