import {
  getFileAssetById,
  getNoteContent,
  isMarkdownFileRecord,
} from "@/lib/file-data";
import { sanitizeArchiveSegment } from "./workspace-item-archive-model";

async function fetchWorkspaceArchiveFileBytes(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to fetch file payload: ${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function loadWorkspaceArchiveMarkdownContent(input: {
  fileId: string;
  storageUrl: string;
}) {
  const note = await getNoteContent(input.fileId);
  if (typeof note?.content === "string") {
    return note.content;
  }

  return fetch(input.storageUrl)
    .then((response) => (response.ok ? response.text() : ""))
    .catch(() => "");
}

export async function buildWorkspaceItemArchiveEntry(
  workspaceUuid: string,
  fileId: string
): Promise<{ entryName: string; fileName: string; bytes: Uint8Array } | null> {
  const file = await getFileAssetById(workspaceUuid, fileId);
  if (!file) {
    return null;
  }

  const fileName = sanitizeArchiveSegment(file.name);
  if (isMarkdownFileRecord(file)) {
    const content = await loadWorkspaceArchiveMarkdownContent({
      fileId: file.id,
      storageUrl: file.storageUrl,
    });

    return {
      entryName: fileName,
      fileName,
      bytes: Buffer.from(content, "utf8"),
    };
  }

  return {
    entryName: fileName,
    fileName,
    bytes: await fetchWorkspaceArchiveFileBytes(file.storageUrl),
  };
}

export async function buildWorkspaceItemSingleDownload(
  workspaceUuid: string,
  fileId: string
): Promise<{
  bytes: Uint8Array;
  contentType: string;
  fileName: string;
} | null> {
  const file = await getFileAssetById(workspaceUuid, fileId);
  if (!file) {
    return null;
  }

  if (isMarkdownFileRecord(file)) {
    const content = await loadWorkspaceArchiveMarkdownContent({
      fileId: file.id,
      storageUrl: file.storageUrl,
    });

    return {
      bytes: Buffer.from(content, "utf8"),
      contentType: "text/markdown; charset=utf-8",
      fileName: file.name,
    };
  }

  return {
    bytes: await fetchWorkspaceArchiveFileBytes(file.storageUrl),
    contentType: file.mimeType ?? "application/octet-stream",
    fileName: file.name,
  };
}
