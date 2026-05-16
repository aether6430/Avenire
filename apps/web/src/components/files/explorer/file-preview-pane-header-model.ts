import type { FolderRecord } from "@/components/files/explorer/shared";

export function canUseFilePreviewPaneCircleToAi(options: {
  isImage: boolean;
  isPdf: boolean;
  isVideo: boolean;
}) {
  return options.isPdf || options.isImage || options.isVideo;
}

export function getFilePreviewPaneHeaderMoveTargets(
  allFolders: FolderRecord[]
) {
  return allFolders.filter((folder) => !folder.readOnly).slice(0, 20);
}
