import type { FolderRecord } from "@/components/files/explorer/shared";

export function canUseExplorerPaneHeaderFolderActions(
  isAtWorkspaceRoot: boolean,
  currentFolder: FolderRecord | null
) {
  return !(isAtWorkspaceRoot || !currentFolder);
}

export function getExplorerPaneHeaderMoveTargets(
  allFolders: FolderRecord[],
  currentFolder: FolderRecord | null
) {
  if (!currentFolder) {
    return [];
  }

  return allFolders
    .filter((folder) => folder.id !== currentFolder.id && !folder.readOnly)
    .slice(0, 20);
}
