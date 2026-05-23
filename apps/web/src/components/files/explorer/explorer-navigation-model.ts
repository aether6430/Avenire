import type { FileRecord } from "@/components/files/explorer/shared";

interface BuildExplorerFolderRouteOptions {
  folderId: string;
  workspaceUuid: string;
}

interface BuildExplorerFileRouteOptions
  extends BuildExplorerFolderRouteOptions {
  baseSearchParams?: string;
  fileId?: string | null;
  retrievalChunkId?: string | null;
}

export function buildExplorerFolderRoute({
  folderId,
  workspaceUuid,
}: BuildExplorerFolderRouteOptions) {
  return `/workspace/files/${workspaceUuid}/folder/${folderId}`;
}

export function buildExplorerFileRoute({
  baseSearchParams,
  fileId,
  folderId,
  retrievalChunkId,
  workspaceUuid,
}: BuildExplorerFileRouteOptions) {
  const params = new URLSearchParams(baseSearchParams ?? "");

  if (fileId) {
    params.set("file", fileId);
  } else {
    params.delete("file");
  }

  if (retrievalChunkId) {
    params.set("retrievalChunk", retrievalChunkId);
  } else if (retrievalChunkId === null) {
    params.delete("retrievalChunk");
  }

  params.delete("circleToAi");

  const query = params.toString();
  const folderRoute = buildExplorerFolderRoute({ folderId, workspaceUuid });
  return query.length > 0 ? `${folderRoute}?${query}` : folderRoute;
}

export function resolveExplorerFileTargetFolderId(
  files: FileRecord[],
  fileId: string,
  fallbackFolderId: string
) {
  return files.find((file) => file.id === fileId)?.folderId ?? fallbackFolderId;
}
