import { z } from "zod";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

const querySchema = z.object({
  workspaceUuid: z.string().trim().uuid(),
  query: z.string().trim().min(1),
  limit: z.number().int().positive().max(50).optional(),
  mode: z.enum(["auto", "fast", "full"]).optional(),
  sourceType: z
    .enum(["pdf", "image", "video", "audio", "markdown", "link"])
    .optional(),
  provider: optionalTrimmedString,
});

export function parseRetrievalQueryBody(body: unknown) {
  return querySchema.safeParse(body);
}

export function buildRetrievalQuerySuccessHeaders(cache: string) {
  return { "x-rag-cache": cache };
}

export const RETRIEVAL_QUERY_ROUTE_ERROR = "Failed to query retrieval index";

export function resolveRetrievalQueryRouteError(
  error: unknown,
  fallback: string
) {
  return error instanceof Error ? error.message : fallback;
}
