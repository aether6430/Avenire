import { Cause, Effect, Exit, Result, Schema } from "effect-v4";

export const unknownJsonRequestSchema = Schema.Unknown;

export class InvalidJsonRequest extends Schema.TaggedErrorClass<InvalidJsonRequest>()(
  "InvalidJsonRequest",
  {}
) {}

export class InvalidRequestPayload extends Schema.TaggedErrorClass<InvalidRequestPayload>()(
  "InvalidRequestPayload",
  {}
) {}

export class RequestAborted extends Schema.TaggedErrorClass<RequestAborted>()(
  "RequestAborted",
  {}
) {}

export type JsonRequestError =
  | InvalidJsonRequest
  | InvalidRequestPayload
  | RequestAborted;

export type JsonRequestFailureReason =
  | "invalid-json"
  | "invalid-payload"
  | "request-aborted";

export interface JsonRequestFailure {
  reason: JsonRequestFailureReason;
  success: false;
}

interface JsonRequestSuccess<T> {
  data: T;
  success: true;
}

export type JsonRequestResult<T> = JsonRequestFailure | JsonRequestSuccess<T>;

export interface JsonRequestMetadata {
  requestId?: string;
  route?: string;
}

interface ResolvedJsonRequestMetadata {
  requestId: string;
  route: string;
}

function resolveJsonRequestMetadata(
  request: Request,
  metadata: JsonRequestMetadata
): ResolvedJsonRequestMetadata {
  return {
    requestId:
      metadata.requestId ??
      request.headers.get("x-request-id") ??
      request.headers.get("x-correlation-id") ??
      "unknown",
    route: metadata.route ?? new URL(request.url).pathname,
  };
}

function requestErrorReason(
  error: JsonRequestError
): JsonRequestFailureReason {
  switch (error._tag) {
    case "InvalidJsonRequest":
      return "invalid-json";
    case "InvalidRequestPayload":
      return "invalid-payload";
    case "RequestAborted":
      return "request-aborted";
  }
}

/**
 * Converts private typed request errors to the stable result consumed by route
 * adapters. Error causes and schema diagnostics never cross the HTTP boundary.
 */
export function serializeJsonRequestError(
  error: JsonRequestError
): JsonRequestFailure {
  return { reason: requestErrorReason(error), success: false };
}

export const decodeJsonRequest = Effect.fn("api.request.decodeJson")(
  function* <T>(
    request: Request,
    schema: Schema.Codec<T, unknown, never, never>,
    metadata: JsonRequestMetadata = {}
  ) {
    const requestMetadata = resolveJsonRequestMetadata(request, metadata);

    if (request.signal.aborted) {
      return yield* RequestAborted.make({});
    }

    const body = yield* Effect.tryPromise({
      catch: () => InvalidJsonRequest.make({}),
      try: () => request.json(),
    });

    if (request.signal.aborted) {
      return yield* RequestAborted.make({});
    }

    return yield* Schema.decodeUnknownEffect(schema)(body).pipe(
      Effect.mapError(() => InvalidRequestPayload.make({})),
      Effect.annotateLogs({
        requestId: requestMetadata.requestId,
        route: requestMetadata.route,
      }),
      Effect.withSpan("api.request.schemaDecode", {
        attributes: {
          "api.request.id": requestMetadata.requestId,
          "http.route": requestMetadata.route,
        },
      })
    );
  }
);

export async function parseJsonRequest<T>(
  request: Request,
  schema: Schema.Codec<T, unknown, never, never>,
  metadata: JsonRequestMetadata = {}
): Promise<JsonRequestResult<T>> {
  const requestMetadata = resolveJsonRequestMetadata(request, metadata);
  const decodedExit = await Effect.runPromiseExit(
    decodeJsonRequest(request, schema, requestMetadata).pipe(
      Effect.annotateLogs({
        requestId: requestMetadata.requestId,
        route: requestMetadata.route,
      }),
      Effect.withSpan("api.request.parseJson", {
        attributes: {
          "api.request.id": requestMetadata.requestId,
          "http.method": request.method,
          "http.route": requestMetadata.route,
        },
      })
    ),
    { signal: request.signal }
  );

  if (Exit.isSuccess(decodedExit)) {
    return { data: decodedExit.value, success: true };
  }

  if (request.signal.aborted) {
    return serializeJsonRequestError(RequestAborted.make({}));
  }

  const failure = Cause.findError(decodedExit.cause);
  if (Result.isSuccess(failure)) {
    return serializeJsonRequestError(failure.success);
  }

  // All expected parse/decode failures are typed above. This defensive branch
  // redacts an unexpected runtime cause rather than exposing it to callers.
  return serializeJsonRequestError(InvalidJsonRequest.make({}));
}
