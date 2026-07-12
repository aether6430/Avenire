import { Cause, Effect, Exit, Result, Schema } from "effect-v4";
import { NextResponse } from "next/server";
import { createApiLogger } from "@/lib/observability";

export class ApiUnauthorized extends Schema.TaggedErrorClass<ApiUnauthorized>()(
  "ApiUnauthorized",
  { message: Schema.String }
) {}

export class ApiInvalidRequest extends Schema.TaggedErrorClass<ApiInvalidRequest>()(
  "ApiInvalidRequest",
  { message: Schema.String }
) {}

export class ApiConflict extends Schema.TaggedErrorClass<ApiConflict>()(
  "ApiConflict",
  { message: Schema.String }
) {}

export class ApiUnavailable extends Schema.TaggedErrorClass<ApiUnavailable>()(
  "ApiUnavailable",
  { message: Schema.String }
) {}

export class ApiInternalError extends Schema.TaggedErrorClass<ApiInternalError>()(
  "ApiInternalError",
  { message: Schema.String }
) {}

export class ApiRequestCancelled extends Schema.TaggedErrorClass<ApiRequestCancelled>()(
  "ApiRequestCancelled",
  { message: Schema.String }
) {}

export type ApiHandlerError =
  | ApiUnauthorized
  | ApiInvalidRequest
  | ApiConflict
  | ApiUnavailable
  | ApiInternalError
  | ApiRequestCancelled;

export class ApiErrorResponse extends Schema.Class<ApiErrorResponse>(
  "ApiErrorResponse"
)({ error: Schema.String }) {}

interface ApiHandlerOptions<A> {
  readonly feature: string;
  readonly route: string;
  readonly successSchema: Schema.Codec<A, unknown, never, never>;
  readonly successStatus?: number | ((value: A) => number);
  readonly userId?: string | null;
  readonly workspaceId?: string | null;
}

interface SerializedApiError {
  readonly body: ApiErrorResponse;
  readonly status: number;
}

export function serializeApiHandlerError(
  error: ApiHandlerError
): SerializedApiError {
  const body = new ApiErrorResponse({ error: error.message });
  switch (error._tag) {
    case "ApiUnauthorized":
      return { body, status: 401 };
    case "ApiInvalidRequest":
      return { body, status: 400 };
    case "ApiConflict":
      return { body, status: 409 };
    case "ApiUnavailable":
      return { body, status: 503 };
    case "ApiInternalError":
      return { body, status: 500 };
    case "ApiRequestCancelled":
      return { body, status: 499 };
  }
}

function resolveSuccessStatus<A>(
  configuredStatus: ApiHandlerOptions<A>["successStatus"],
  value: A
) {
  return typeof configuredStatus === "function"
    ? configuredStatus(value)
    : (configuredStatus ?? 200);
}

/**
 * Runs a fully-provided Effect at the HTTP edge. Typed failures are mapped to a
 * stable public contract; defects and encoding failures are redacted.
 */
export async function runApiHandler<A>(
  request: Request,
  program: Effect.Effect<A, ApiHandlerError>,
  options: ApiHandlerOptions<A>
): Promise<NextResponse> {
  const startedAt = performance.now();
  const logger = createApiLogger({
    feature: options.feature,
    request,
    route: options.route,
    userId: options.userId,
    workspaceId: options.workspaceId,
  });
  void logger.requestStarted();

  const exit = await Effect.runPromiseExit(program, { signal: request.signal });
  const durationMs = Math.round(performance.now() - startedAt);

  if (Exit.isSuccess(exit)) {
    const validated = await Effect.runPromiseExit(
      Schema.decodeUnknownEffect(options.successSchema)(exit.value)
    );
    if (Exit.isSuccess(validated)) {
      const status = resolveSuccessStatus(options.successStatus, validated.value);
      if (status >= 400) {
        void logger.requestFailed(status, "Non-success response status", {
          durationMs,
        });
      } else {
        void logger.requestSucceeded(status, { durationMs });
      }
      return NextResponse.json(validated.value, { status });
    }

    const error = ApiInternalError.make({ message: "Internal server error" });
    void logger.requestFailed(500, "Invalid handler response", { durationMs });
    return NextResponse.json(serializeApiHandlerError(error).body, {
      status: 500,
    });
  }

  const error = request.signal.aborted
    ? ApiRequestCancelled.make({ message: "Request cancelled" })
    : Result.match(Cause.findError(exit.cause), {
        onFailure: () =>
          ApiInternalError.make({ message: "Internal server error" }),
        onSuccess: (failure) => failure,
      });
  const serialized = serializeApiHandlerError(error);
  void logger.requestFailed(serialized.status, error, { durationMs });
  return NextResponse.json(serialized.body, { status: serialized.status });
}
