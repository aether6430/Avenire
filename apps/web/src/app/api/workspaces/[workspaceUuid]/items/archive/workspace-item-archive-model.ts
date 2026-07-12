import { Schema } from "effect-v4";

import { NextResponse } from "next/server";
import { resolveApiErrorMessage } from "@/lib/api-error-message";

export type WorkspaceArchiveItemKind = "file" | "folder";

export interface WorkspaceArchiveItem {
  id: string;
  kind: WorkspaceArchiveItemKind;
}

const workspaceArchiveItemSchema = Schema.Struct({
  id: Schema.Trim.check(Schema.isMinLength(1)),
  kind: Schema.Literals(["file", "folder"]),
});

export const workspaceItemArchiveRequestSchema = Schema.Union([
  workspaceArchiveItemSchema,
  Schema.Struct({
    items: Schema.Array(workspaceArchiveItemSchema).check(
      Schema.isMinLength(1)
    ),
  }),
]);

export const WORKSPACE_ITEM_ARCHIVE_ERROR =
  "Unable to prepare archive download.";

export function resolveRequestedArchiveItems(
  input: typeof workspaceItemArchiveRequestSchema.Type
): WorkspaceArchiveItem[] {
  return "items" in input ? [...input.items] : [input];
}

export function sanitizeArchiveSegment(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-").trim() || "untitled";
}

export function createArchiveDownloadResponse(input: {
  bytes: Uint8Array;
  contentType: string;
  fileName: string;
}) {
  const escapedFileName = input.fileName.replace(/"/g, '\\"');
  const encodedFileName = encodeURIComponent(input.fileName);

  return new NextResponse(Buffer.from(input.bytes), {
    headers: {
      "Content-Disposition": `attachment; filename="${escapedFileName}"; filename*=UTF-8''${encodedFileName}`,
      "Content-Type": input.contentType,
    },
  });
}

export function addArchiveEntry(
  archiveEntries: Record<string, Uint8Array>,
  requestedPath: string,
  bytes: Uint8Array
) {
  if (!archiveEntries[requestedPath]) {
    archiveEntries[requestedPath] = bytes;
    return;
  }

  const lastSlashIndex = requestedPath.lastIndexOf("/");
  const dirname =
    lastSlashIndex >= 0 ? requestedPath.slice(0, lastSlashIndex) : "";
  const basename =
    lastSlashIndex >= 0
      ? requestedPath.slice(lastSlashIndex + 1)
      : requestedPath;
  const dotIndex = basename.lastIndexOf(".");
  const base = dotIndex > 0 ? basename.slice(0, dotIndex) : basename;
  const extension = dotIndex > 0 ? basename.slice(dotIndex) : "";

  let copyIndex = 1;
  while (copyIndex < 10_000) {
    const candidateName = `${base} (${copyIndex})${extension}`;
    const candidatePath = dirname
      ? `${dirname}/${candidateName}`
      : candidateName;
    if (!archiveEntries[candidatePath]) {
      archiveEntries[candidatePath] = bytes;
      return;
    }
    copyIndex += 1;
  }
}

export function resolveWorkspaceItemArchiveError(
  error: unknown,
  fallback: string
) {
  return resolveApiErrorMessage(error, fallback);
}
