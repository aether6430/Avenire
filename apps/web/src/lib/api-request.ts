import { Effect, Exit, Schema } from "effect-v4";

interface JsonRequestFailure {
  reason: "invalid-json" | "invalid-payload";
  success: false;
}

interface JsonRequestSuccess<T> {
  data: T;
  success: true;
}

export type JsonRequestResult<T> = JsonRequestFailure | JsonRequestSuccess<T>;

export async function parseJsonRequest<T>(
  request: Request,
  schema: Schema.Schema<T>
): Promise<JsonRequestResult<T>> {
  const bodyExit = await Effect.runPromiseExit(
    Effect.tryPromise(() => request.json()),
    { signal: request.signal }
  );
  if (!Exit.isSuccess(bodyExit)) {
    return { reason: "invalid-json", success: false };
  }

  const parsedExit = await Effect.runPromiseExit(
    Schema.decodeUnknownEffect(schema)(bodyExit.value),
    { signal: request.signal }
  );
  if (!Exit.isSuccess(parsedExit)) {
    return { reason: "invalid-payload", success: false };
  }

  return { data: parsedExit.value, success: true };
}
