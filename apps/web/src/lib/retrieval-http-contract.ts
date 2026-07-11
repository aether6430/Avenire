import { Schema } from "effect-v4";
import { z } from "zod";

export const retrievalSourceTypeSchema = Schema.Literals([
  "pdf",
  "image",
  "video",
  "audio",
  "document",
  "markdown",
  "link",
]);

const retrievalQuerySchema = Schema.Trim.check(Schema.isLengthBetween(1, 2000));
const workspaceUuidSchema = Schema.String.check(Schema.isUUID(4));

export const retrievalQueryRequestSchema = Schema.Struct({
  workspaceUuid: workspaceUuidSchema,
  query: retrievalQuerySchema,
  limit: Schema.optional(
    Schema.Number.check(
      Schema.isInt(),
      Schema.isGreaterThan(0),
      Schema.isLessThanOrEqualTo(50)
    )
  ),
  mode: Schema.optional(Schema.Literals(["auto", "fast", "full"])),
  sourceType: Schema.optional(retrievalSourceTypeSchema),
  provider: Schema.optional(Schema.Trim.check(Schema.isLengthBetween(1, 100))),
});

export const retrievalSummaryRequestSchema = Schema.Struct({
  matches: Schema.optional(
    Schema.Array(
      Schema.Struct({
        fileId: workspaceUuidSchema,
        sourceType: Schema.optional(retrievalSourceTypeSchema),
        snippet: Schema.optional(
          Schema.Trim.check(Schema.isLengthBetween(1, 4000))
        ),
        title: Schema.optional(
          Schema.Trim.check(Schema.isLengthBetween(1, 512))
        ),
      })
    ).check(Schema.isMaxLength(24))
  ),
  fileIds: Schema.optional(
    Schema.Array(workspaceUuidSchema).check(Schema.isMaxLength(10))
  ),
  workspaceUuid: workspaceUuidSchema,
  query: retrievalQuerySchema,
  stream: Schema.optional(Schema.Boolean),
});

const retrievalSourceTypeResponseSchema = z.enum([
  "pdf",
  "image",
  "video",
  "audio",
  "document",
  "markdown",
  "link",
]);

const retrievalQueryResultSchema = z
  .object({
    chunkId: z.string().min(1).optional(),
    content: z.string(),
    endMs: z.number().finite().nullable().optional(),
    fileId: z.string().min(1).nullable().optional(),
    page: z.number().int().positive().nullable().optional(),
    rerankScore: z.number().finite().optional(),
    score: z.number().finite().optional(),
    sourceType: retrievalSourceTypeResponseSchema.optional(),
    startMs: z.number().finite().nullable().optional(),
    title: z.string().nullable().optional(),
  })
  .passthrough();

export const retrievalQueryResponseSchema = z
  .object({
    results: z.array(retrievalQueryResultSchema),
  })
  .passthrough();

export type RetrievalQueryRequest = typeof retrievalQueryRequestSchema.Type;
export type RetrievalSummaryRequest = typeof retrievalSummaryRequestSchema.Type;
