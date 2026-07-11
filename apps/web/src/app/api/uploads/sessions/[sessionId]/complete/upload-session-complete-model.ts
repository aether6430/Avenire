import { NextResponse } from "next/server";
import { Schema } from "effect-v4";

const metadataSchema = Schema.Record(Schema.String, Schema.Unknown);
const sharedFields = {
  checksumSha256: Schema.optional(Schema.String),
  metadata: Schema.optional(metadataSchema),
  mimeType: Schema.optional(Schema.NullOr(Schema.String)),
};

const directCompletionSchema = Schema.Struct({
  ...sharedFields,
  sizeBytes: Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
  storageKey: Schema.String.check(Schema.isMinLength(1)),
  storageUrl: Schema.String.check(Schema.isMinLength(1)),
});

const multipartCompletionSchema = Schema.Struct({
  ...sharedFields,
  multipart: Schema.Struct({
    partNumbers: Schema.optional(
      Schema.Array(Schema.Number.check(Schema.isInt(), Schema.isGreaterThan(0)))
    ),
  }),
  sizeBytes: Schema.optional(Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0))),
  storageKey: Schema.optional(Schema.String.check(Schema.isMinLength(1))),
  storageUrl: Schema.optional(Schema.String.check(Schema.isMinLength(1))),
});

export const completeSchema = Schema.Union([
  directCompletionSchema,
  multipartCompletionSchema,
]);
export type CompleteUploadPayload = typeof completeSchema.Type;

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

export function buildUploadCompletionReplayResponse(input: { session: { result?: { fileId?: string | null; ingestionJobId?: string | null; deduplicated?: boolean | null } | null } }) {
  return NextResponse.json({
    ok: true,
    session: input.session,
    fileId: input.session.result?.fileId ?? null,
    ingestionJobId: input.session.result?.ingestionJobId ?? null,
    deduplicated: input.session.result?.deduplicated ?? false,
  }, { status: 200 });
}

export function buildUploadCompletionSuccessResponse(input: { file: unknown; ingestionJob: unknown; session: unknown }) {
  return NextResponse.json({ ok: true, session: input.session, file: input.file, ingestionJob: input.ingestionJob }, { status: 200 });
}
