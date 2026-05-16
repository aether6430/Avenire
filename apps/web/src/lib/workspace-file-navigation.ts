import type { Route } from "next";
import { getWorkspaceTreePayload } from "@/lib/workspace-tree-client";
import { createWorkspaceTreePathResolver } from "@/lib/workspace-tree-read-model";

export async function resolveWorkspaceFileRoute(
  workspaceUuid: string,
  fileIdentifier: string
): Promise<Route | null> {
  if (!(workspaceUuid && fileIdentifier)) {
    return null;
  }

  const trimmedIdentifier = fileIdentifier.trim();
  if (!trimmedIdentifier) {
    return null;
  }

  const isLikelyWorkspacePath =
    trimmedIdentifier.includes("/") || trimmedIdentifier.includes(".");

  if (isLikelyWorkspacePath) {
    const payload = await getWorkspaceTreePayload(workspaceUuid, {
      preferCache: true,
    });
    if (!payload) {
      return null;
    }
    const matchedFile =
      createWorkspaceTreePathResolver(payload).findFileByWorkspacePath(
        trimmedIdentifier
      );

    if (!matchedFile) {
      return null;
    }

    return `/workspace/files/${workspaceUuid}/folder/${matchedFile.folderId}?file=${matchedFile.id}` as Route;
  }

  const response = await fetch(
    `/api/workspaces/${workspaceUuid}/files/${trimmedIdentifier}`,
    {
      cache: "no-store",
    }
  );
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    file?: { folderId?: string | null };
  };
  const folderId = payload.file?.folderId?.trim();
  if (!folderId) {
    return null;
  }

  return `/workspace/files/${workspaceUuid}/folder/${folderId}?file=${trimmedIdentifier}` as Route;
}
