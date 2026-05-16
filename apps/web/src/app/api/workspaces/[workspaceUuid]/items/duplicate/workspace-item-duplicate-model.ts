import { randomUUID } from "node:crypto";
import { z } from "zod";

export const workspaceItemDuplicateSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["file", "folder"]),
  parentId: z.string().min(1).nullable().optional(),
});

export type WorkspaceItemDuplicateRequest = z.infer<
  typeof workspaceItemDuplicateSchema
>;

export interface DuplicateFolderLike {
  id: string;
  name: string;
  parentId: string | null;
}

export function resolveDuplicateName(
  existingNames: string[],
  requestedName: string
) {
  const existingNameSet = new Set(
    existingNames.map((name) => name.toLowerCase())
  );

  const dotIndex = requestedName.lastIndexOf(".");
  const hasExtension = dotIndex > 0 && dotIndex < requestedName.length - 1;
  const baseName = hasExtension
    ? requestedName.slice(0, dotIndex)
    : requestedName;
  const extension = hasExtension ? requestedName.slice(dotIndex) : "";
  const safeBaseName = baseName || "Untitled";

  if (!existingNameSet.has(requestedName.toLowerCase())) {
    return requestedName;
  }

  let copyIndex = 1;
  while (copyIndex < 10_000) {
    const suffix = ` (${copyIndex})`;
    const maxBaseLength = Math.max(1, 255 - extension.length - suffix.length);
    const candidateBase = safeBaseName.slice(0, maxBaseLength);
    const candidate = `${candidateBase}${suffix}${extension}`;
    if (!existingNameSet.has(candidate.toLowerCase())) {
      return candidate;
    }
    copyIndex += 1;
  }

  return `${safeBaseName}-${randomUUID().slice(0, 8)}${extension}`;
}

export function collectDuplicateDescendants(
  workspaceFolders: DuplicateFolderLike[],
  sourceFolderId: string
) {
  const folderById = new Map(
    workspaceFolders.map((folder) => [folder.id, folder])
  );

  const isDescendantOfSource = (folder: DuplicateFolderLike) => {
    let cursor = folder.parentId;
    while (cursor) {
      if (cursor === sourceFolderId) {
        return true;
      }
      cursor = folderById.get(cursor)?.parentId ?? null;
    }
    return false;
  };

  const depthByFolderId = new Map<string, number>();
  const getDepth = (folderId: string) => {
    const cachedDepth = depthByFolderId.get(folderId);
    if (typeof cachedDepth === "number") {
      return cachedDepth;
    }

    let depth = 0;
    let cursor = folderById.get(folderId)?.parentId ?? null;
    while (cursor) {
      depth += 1;
      cursor = folderById.get(cursor)?.parentId ?? null;
    }

    depthByFolderId.set(folderId, depth);
    return depth;
  };

  return workspaceFolders
    .filter(isDescendantOfSource)
    .sort((left, right) => getDepth(left.id) - getDepth(right.id));
}
