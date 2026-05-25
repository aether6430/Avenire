import type { Route } from "next";
import {
  getWorkspaceTreePayload,
  loadWorkspaceTreePayload,
} from "@/lib/workspace-tree-client";
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
    const cachedPayload = await getWorkspaceTreePayload(workspaceUuid, {
      preferCache: true,
    });
    if (!cachedPayload) {
      return null;
    }
    const cachedResolver = createWorkspaceTreePathResolver(cachedPayload);
    const cachedMatch =
      cachedResolver.findFileByWorkspacePath(trimmedIdentifier);
    if (cachedMatch) {
      return `/workspace/files/${workspaceUuid}/folder/${cachedMatch.folderId}?file=${cachedMatch.id}` as Route;
    }

    const freshPayload = await loadWorkspaceTreePayload(workspaceUuid);
    if (!freshPayload) {
      return null;
    }
    const freshMatch =
      createWorkspaceTreePathResolver(freshPayload).findFileByWorkspacePath(
        trimmedIdentifier
      );

    if (!freshMatch) {
      return null;
    }

    return `/workspace/files/${workspaceUuid}/folder/${freshMatch.folderId}?file=${freshMatch.id}` as Route;
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
