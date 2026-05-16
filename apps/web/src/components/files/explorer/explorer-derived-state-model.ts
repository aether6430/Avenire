import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";

export const DEFAULT_EXPLORER_FOLDER_BANNER_URL =
  "https://gtgr46laft.ufs.sh/f/7avzGFBuzbjB9vfw3D1PxUaEr7wSqNQiFgMAvYKy35DlcXb0";

interface BuildExplorerCurrentSurfaceOptions {
  breadcrumbs: FolderRecord[];
  files: FileRecord[];
  selectedFileParam: string | null;
  workspaceName: string;
}

export function buildExplorerCurrentSurface({
  breadcrumbs,
  files,
  selectedFileParam,
  workspaceName,
}: BuildExplorerCurrentSurfaceOptions) {
  const activeFile =
    files.find((file) => file.id === selectedFileParam) ?? null;
  const currentFolder = breadcrumbs.at(-1) ?? null;
  const parentFolder = breadcrumbs.at(-2) ?? null;
  const isAtWorkspaceRoot = breadcrumbs.length <= 1;
  const currentLocationTitle = isAtWorkspaceRoot
    ? workspaceName
    : (currentFolder?.name ?? workspaceName);
  const currentFolderBannerUrl =
    currentFolder?.bannerUrl && currentFolder.bannerUrl.trim().length > 0
      ? currentFolder.bannerUrl
      : DEFAULT_EXPLORER_FOLDER_BANNER_URL;

  return {
    activeFile,
    currentFolder,
    currentFolderBannerUrl,
    currentLocationTitle,
    isAtWorkspaceRoot,
    isCurrentFolderReadOnly: Boolean(currentFolder?.readOnly),
    parentFolder,
  };
}
