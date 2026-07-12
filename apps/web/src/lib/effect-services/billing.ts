import { Context, Effect, Layer, Schema } from "effect-v4";
import {
  type CreditReconciliation,
  deliverPendingPolarUsageEvents,
  reconcilePolarCreditConsumption,
} from "@/lib/billing-credit-sync";

export class InternalBillingUnauthorized extends Schema.TaggedErrorClass<InternalBillingUnauthorized>()(
  "InternalBillingUnauthorized",
  { message: Schema.String }
) {}

export class InternalBillingAuthorization extends Context.Service<
  InternalBillingAuthorization,
  {
    readonly authorize: (
      request: Request
    ) => Effect.Effect<void, InternalBillingUnauthorized>;
  }
>()("InternalBillingAuthorization") {}

export class BillingRepository extends Context.Service<
  BillingRepository,
  {
    readonly deliverPendingUsage: (
      limit?: number
    ) => ReturnType<typeof deliverPendingPolarUsageEvents>;
  }
>()("BillingRepository") {}

export class PolarProvider extends Context.Service<
  PolarProvider,
  {
    readonly reconcileConsumption: (
      userId: string
    ) => Effect.Effect<
      CreditReconciliation,
      Effect.Error<ReturnType<typeof reconcilePolarCreditConsumption>>
    >;
  }
>()("PolarProvider") {}

export const authorizeInternalBillingRequest = Effect.fn(
  "billing.authorizeInternalRequest"
)(function* (request: Request) {
  const authorization = yield* InternalBillingAuthorization;
  yield* authorization.authorize(request);
});

export const synchronizePendingBillingUsage = Effect.fn(
  "billing.synchronizePendingUsage"
)(function* (limit?: number) {
  const repository = yield* BillingRepository;
  return yield* repository.deliverPendingUsage(limit);
});

export const reconcileBillingConsumption = Effect.fn(
  "billing.reconcileConsumption"
)(function* (userId: string) {
  const polar = yield* PolarProvider;
  return yield* polar.reconcileConsumption(userId);
});

export const InternalBillingAuthorizationLive = Layer.succeed(
  InternalBillingAuthorization
)({
  authorize: (request) => {
    const secret = (
      process.env.BILLING_SYNC_SECRET ??
      process.env.CRON_SECRET ??
      ""
    ).trim();
    return Boolean(secret) &&
      request.headers.get("authorization") === `Bearer ${secret}`
      ? Effect.void
      : Effect.fail(
          InternalBillingUnauthorized.make({ message: "Unauthorized" })
        );
  },
});

export const BillingRepositoryLive = Layer.succeed(BillingRepository)({
  deliverPendingUsage: (limit) => deliverPendingPolarUsageEvents(limit),
});

export const PolarProviderLive = Layer.succeed(PolarProvider)({
  reconcileConsumption: (userId) => reconcilePolarCreditConsumption(userId),
});

export const BillingServicesLive = Layer.mergeAll(
  InternalBillingAuthorizationLive,
  BillingRepositoryLive,
  PolarProviderLive
);
