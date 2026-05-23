import type { FolderRecord } from "@/components/files/explorer/shared";

export function getFilePreviewPaneHeaderMoveTargets(
  allFolders: FolderRecord[]
) {
  return allFolders.filter((folder) => !folder.readOnly).slice(0, 20);
}
