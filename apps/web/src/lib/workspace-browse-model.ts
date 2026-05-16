import type { WorkspaceSearchItem } from "@/components/files/search-model";
import { createWorkspaceFileIndex } from "@/lib/workspace-file-index";
import type { CommandPaletteWorkspaceIndex } from "@/stores/commandPaletteStore";

export type WorkspaceBrowseItemType = "file" | "folder";

export interface WorkspaceBrowseItem {
  folderId?: string;
  id: string;
  name: string;
  path: string;
  type: WorkspaceBrowseItemType;
  workspaceName: string;
  workspaceUuid: string;
}

interface WorkspaceBrowseWorkspaceSummary {
  name: string;
  workspaceId: string;
}

export function buildWorkspaceBrowseCollectionFromIndexes(input: {
  fileIndexByWorkspace: Record<string, CommandPaletteWorkspaceIndex>;
  workspaces: WorkspaceBrowseWorkspaceSummary[];
}) {
  const files: WorkspaceBrowseItem[] = [];
  const folders: WorkspaceBrowseItem[] = [];

  for (const workspace of input.workspaces) {
    const index = input.fileIndexByWorkspace[workspace.workspaceId];
    if (!index) {
      continue;
    }

    const workspaceFileIndex = createWorkspaceFileIndex({
      files: index.files,
      folders: index.folders,
    });

    for (const folder of index.folders) {
      const path =
        workspaceFileIndex.folderPathById.get(folder.id) ?? folder.name;
      folders.push({
        id: folder.id,
        name: folder.name,
        path: path || folder.name,
        type: "folder",
        workspaceName: workspace.name,
        workspaceUuid: workspace.workspaceId,
      });
    }

    for (const { file, workspacePath } of workspaceFileIndex.files) {
      files.push({
        folderId: file.folderId,
        id: file.id,
        name: file.name,
        path: workspacePath,
        type: "file",
        workspaceName: workspace.name,
        workspaceUuid: workspace.workspaceId,
      });
    }
  }

  return { files, folders };
}

export function buildWorkspaceBrowseRecentItems(input: {
  fileItems: WorkspaceBrowseItem[];
  limit?: number;
  recentFileIdsByWorkspace: Record<string, string[]>;
  targetWorkspaceIds: string[];
}) {
  const fileByWorkspaceAndId = new Map(
    input.fileItems.map((file) => [`${file.workspaceUuid}:${file.id}`, file])
  );
  const items: WorkspaceBrowseItem[] = [];

  for (const targetWorkspaceId of input.targetWorkspaceIds) {
    const recentIds = input.recentFileIdsByWorkspace[targetWorkspaceId] ?? [];
    for (const fileId of recentIds) {
      const item = fileByWorkspaceAndId.get(`${targetWorkspaceId}:${fileId}`);
      if (item) {
        items.push(item);
      }
    }
  }

  return items.slice(0, input.limit ?? 8);
}

export function buildWorkspaceRetrievalSearchItems(input: {
  fileItems: WorkspaceBrowseItem[];
  workspaceUuid: string | null;
}): WorkspaceSearchItem[] {
  if (!input.workspaceUuid) {
    return [];
  }

  return input.fileItems
    .filter((file) => file.workspaceUuid === input.workspaceUuid)
    .map((file) => ({
      description: file.workspaceName,
      folderId: file.folderId,
      id: file.id,
      path: file.path,
      snippet: "Match in file content",
      title: file.name,
      type: "file" as const,
      workspaceUuid: file.workspaceUuid,
    }));
}
