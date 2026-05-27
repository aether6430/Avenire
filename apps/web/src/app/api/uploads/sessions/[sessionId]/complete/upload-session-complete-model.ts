import { NextResponse } from "next/server";
import { z } from "zod";

export const completeSchema = z
  .object({
    storageKey: z.string().min(1).optional(),
    storageUrl: z.string().url().optional(),
    mimeType: z.string().nullable().optional(),
    sizeBytes: z.number().int().nonnegative().optional(),
    checksumSha256: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    multipart: z
      .object({
        partNumbers: z.array(z.number().int().positive()).optional(),
      })
      .optional(),
  })
  .refine(
    (value) =>
      (Boolean(value.storageKey) &&
        Boolean(value.storageUrl) &&
        typeof value.sizeBytes === "number") ||
      Boolean(value.multipart),
    {
      message:
        "Provide direct upload metadata or multipart completion payload.",
    }
  );

export type CompleteUploadPayload = z.infer<typeof completeSchema>;

export function asNullableString(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
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
