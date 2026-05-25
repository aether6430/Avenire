import { NextResponse } from "next/server";

export type WorkspaceArchiveItemKind = "file" | "folder";

export interface WorkspaceArchiveItem {
  id: string;
  kind: WorkspaceArchiveItemKind;
}

export const WORKSPACE_ITEM_ARCHIVE_ERROR =
  "Unable to prepare archive download.";

export function resolveRequestedArchiveItems(
  input: unknown
): WorkspaceArchiveItem[] {
  const body =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};

  const items: WorkspaceArchiveItem[] = [];
  if (Array.isArray(body.items)) {
    for (const item of body.items) {
      if (typeof item !== "object" || item === null) {
        continue;
      }

      const candidate = item as Record<string, unknown>;
      const kind = candidate.kind;
      if (
        typeof candidate.id === "string" &&
        candidate.id.trim().length > 0 &&
        (kind === "file" || kind === "folder")
      ) {
        items.push({ id: candidate.id, kind });
      }
    }
  }

  if (items.length > 0) {
    return items;
  }

  const kind = body.kind;
  if (
    typeof body.id === "string" &&
    body.id.trim().length > 0 &&
    (kind === "file" || kind === "folder")
  ) {
    return [{ id: body.id, kind }];
  }

  return [];
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
  return error instanceof Error ? error.message : fallback;
}
