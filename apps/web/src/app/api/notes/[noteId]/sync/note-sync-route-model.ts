import type { PageMetadataState } from "@/lib/frontmatter";
import { z } from "zod";

const noteSyncPostPayloadSchema = z.object({
  base: z.string(),
  current: z.string(),
});

export const NOTE_SYNC_INVALID_PAYLOAD_ERROR = "Invalid sync payload";

export function normalizeNoteSyncId(noteId: string) {
  return noteId.trim();
}

export function parseNoteSyncPostPayload(payload: unknown) {
  return noteSyncPostPayloadSchema.safeParse(payload);
}

export function buildNoteSyncGetResponse(input: {
  markdown: string;
  page: PageMetadataState;
  updatedAt: string;
  version: number;
}) {
  return {
    markdown: input.markdown,
    page: input.page,
    updatedAt: input.updatedAt,
    version: input.version,
  };
}

export function buildNoteSyncPostResponse(input: {
  hasConflict: boolean;
  merged: string;
  updatedAt: string;
  version: number;
}) {
  return {
    hasConflict: input.hasConflict,
    merged: input.merged,
    updatedAt: input.updatedAt,
    version: input.version,
  };
}
