import type { Route } from "next";

export async function resolveWorkspaceFileRoute(
  workspaceUuid: string,
  fileIdentifier: string
): Promise<Route | null> {
  if (!workspaceUuid || !fileIdentifier) {
    return null;
  }

  const trimmedIdentifier = fileIdentifier.trim();
  if (!trimmedIdentifier) {
    return null;
  }

  const isLikelyWorkspacePath =
    trimmedIdentifier.includes("/") || trimmedIdentifier.includes(".");

  if (isLikelyWorkspacePath) {
    const response = await fetch(`/api/workspaces/${workspaceUuid}/tree`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      files?: Array<{
        folderId: string;
        id: string;
        name: string;
      }>;
      folders?: Array<{
        id: string;
        name: string;
        parentId: string | null;
      }>;
    };
    const folderById = new Map(
      (payload.folders ?? []).map((folder) => [folder.id, folder])
    );
    const folderPathCache = new Map<string, string>();
    const resolveFolderPath = (folderId: string | null): string => {
      if (!folderId) {
        return "";
      }
      const cached = folderPathCache.get(folderId);
      if (cached !== undefined) {
        return cached;
      }

      const segments: string[] = [];
      let cursor: string | null = folderId;
      const seen = new Set<string>();
      while (cursor) {
        if (seen.has(cursor)) {
          break;
        }
        seen.add(cursor);
        const folder = folderById.get(cursor);
        if (!folder || folder.parentId === null) {
          break;
        }
        segments.push(folder.name);
        cursor = folder.parentId;
      }

      const resolvedPath = segments.reverse().join("/");
      folderPathCache.set(folderId, resolvedPath);
      return resolvedPath;
    };

    const matchedFile = (payload.files ?? []).find((file) => {
      const parentPath = resolveFolderPath(file.folderId);
      const workspacePath = parentPath
        ? `${parentPath}/${file.name}`
        : file.name;
      return workspacePath === trimmedIdentifier;
    });

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
