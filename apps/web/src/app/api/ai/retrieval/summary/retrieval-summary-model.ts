import type { ApolloModelName } from "@avenire/ai";
import { NextResponse } from "next/server";
import { z } from "zod";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

const retrievalSummarySourceTypeSchema = z.enum([
  "pdf",
  "image",
  "video",
  "audio",
  "markdown",
  "link",
]);

export const summarySchema = z.object({
  matches: z
    .array(
      z.object({
        fileId: z.string().trim().uuid(),
        sourceType: retrievalSummarySourceTypeSchema.optional(),
        snippet: optionalTrimmedString,
        title: optionalTrimmedString,
      })
    )
    .max(24)
    .optional(),
  fileIds: z.array(z.string().trim().uuid()).max(10).optional(),
  workspaceUuid: z.string().trim().uuid(),
  query: z.string().trim().min(1),
  stream: z.boolean().optional(),
});

export type RetrievalSummaryPayload = z.infer<typeof summarySchema>;

export const FALLBACK_SUMMARY =
  "I could not find a reliable answer in the matched files. Try narrowing your question or selecting a more specific file.";
export const DEFAULT_ATTACHMENT_LIMIT = 3;
export const DEFAULT_ATTACHMENT_MAX_BYTES = 8 * 1024 * 1024;
export const DEFAULT_FETCH_TIMEOUT_MS = 20_000;
export const DOCUMENT_SOURCE_TYPES = new Set(["markdown", "pdf", "link"]);
export const RETRIEVAL_SUMMARY_MODEL_ALIAS: ApolloModelName = "apollo-sprint";
export const RETRIEVAL_SUMMARY_ROUTE_ERROR =
  "Failed to summarize retrieval evidence";

export function summaryResponse(summary: string, stream?: boolean) {
  if (stream) {
    return new Response(summary, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  return NextResponse.json({ summary });
}

export function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveRequestedFileIds(input: RetrievalSummaryPayload) {
  const matches = input.matches ?? [];
  const matchedFileIds = matches.map((match) => match.fileId);
  const fallbackFileIds = input.fileIds ?? [];

  return Array.from(new Set([...matchedFileIds, ...fallbackFileIds])).slice(
    0,
    12
  );
}

export function resolveRetrievalSummaryLimits(
  env: NodeJS.ProcessEnv = process.env
) {
  return {
    attachmentLimit: Math.min(
      6,
      toPositiveInt(
        env.RETRIEVAL_SUMMARY_ATTACHMENT_LIMIT,
        DEFAULT_ATTACHMENT_LIMIT
      )
    ),
    attachmentMaxBytes: Math.max(
      256_000,
      toPositiveInt(
        env.RETRIEVAL_SUMMARY_ATTACHMENT_MAX_BYTES,
        DEFAULT_ATTACHMENT_MAX_BYTES
      )
    ),
    fetchTimeoutMs: Math.max(
      2000,
      toPositiveInt(
        env.RETRIEVAL_SUMMARY_FETCH_TIMEOUT_MS,
        DEFAULT_FETCH_TIMEOUT_MS
      )
    ),
  };
}

export function buildRetrievalSummaryPrompt(input: {
  query: string;
  textualEvidence: string[];
}) {
  return [
    "Answer the user's question using only the provided retrieval evidence.",
    "For markdown/pdf/link files, use the provided retrieved chunks as the source of truth.",
    "For attached media files, inspect the file content directly.",
    "Provide short per-file descriptions in bullet points (1-2 lines each).",
    "Do not claim details that are not present in evidence.",
    "If evidence is insufficient, say what is missing.",
    `User question: ${input.query}`,
    input.textualEvidence.length > 0
      ? `Retrieved document chunks:\n\n${input.textualEvidence.join("\n\n")}`
      : "Retrieved document chunks: none",
  ].join("\n");
}

export function resolveRetrievalSummaryRouteError(
  error: unknown,
  fallback: string
) {
  return error instanceof Error ? error.message : fallback;
}
