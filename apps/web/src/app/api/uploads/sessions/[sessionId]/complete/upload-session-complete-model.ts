import { Schema } from "effect-v4";
import { NextResponse } from "next/server";

const metadataSchema = Schema.Record(Schema.String, Schema.Unknown);
const sharedFields = {
  checksumSha256: Schema.optional(Schema.String),
  metadata: Schema.optional(metadataSchema),
};

const multipartCompletionSchema = Schema.Struct({
  ...sharedFields,
  multipart: Schema.Struct({
    partNumbers: Schema.optional(
      Schema.Array(Schema.Number.check(Schema.isInt(), Schema.isGreaterThan(0)))
    ),
  }),
});

export const completeSchema = multipartCompletionSchema;
export type CompleteUploadPayload = typeof completeSchema.Type;

export function readExpectedMultipartPartNumbers(
  payload: CompleteUploadPayload
): number[] | undefined {
  return "multipart" in payload && payload.multipart.partNumbers
    ? Array.from(payload.multipart.partNumbers)
    : undefined;
}

export function asNullableString(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function readUploadCompletionErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }
  return typeof error.code === "string" ? error.code : null;
}

export function buildUploadCompletionReplayResponse(input: {
  session: {
    result?: {
      fileId?: string | null;
      ingestionJobId?: string | null;
      deduplicated?: boolean | null;
    } | null;
  };
}) {
  return NextResponse.json(
    {
      ok: true,
      session: input.session,
      fileId: input.session.result?.fileId ?? null,
      ingestionJobId: input.session.result?.ingestionJobId ?? null,
      deduplicated: input.session.result?.deduplicated ?? false,
    },
    { status: 200 }
  );
}

export function buildUploadCompletionSuccessResponse(input: {
  file: unknown;
  ingestionJob: unknown;
  session: unknown;
}) {
  return NextResponse.json(
    {
      ok: true,
      session: input.session,
      file: input.file,
      ingestionJob: input.ingestionJob,
    },
    { status: 200 }
  );
}
