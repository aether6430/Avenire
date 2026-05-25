import type {
  BuildExplorerBrowsePanePropsOptions,
  ExplorerBrowsePaneProps,
} from "@/components/files/explorer/explorer-browse-pane-props-shared";
import { buildExplorerBrowseSurfaceProps } from "@/components/files/explorer/explorer-browse-surface-props";
import { buildExplorerCanvasShellProps } from "@/components/files/explorer/explorer-canvas-shell-props";
import { buildExplorerContentDialogsProps } from "@/components/files/explorer/explorer-content-dialogs-props";
import { buildExplorerControlsProps } from "@/components/files/explorer/explorer-controls-props";
import { buildExplorerMobileActionsProps } from "@/components/files/explorer/explorer-mobile-actions-props";

export function buildExplorerBrowsePaneProps({
  bannerInputRef,
  bannerUploadBusy,
  currentFolder,
  currentFolderBannerUrl,
  fileInputRef,
  fileShareDialogProps,
  folderInputRef,
  folderShareDialogProps,
  isMobile,
  onBannerInputChange,
  onChangeFolderBanner,
  onQueueFiles,
  onQueueFolderFiles,
  onResetFolderBanner,
  searchBarProps,
  ...options
}: BuildExplorerBrowsePanePropsOptions): ExplorerBrowsePaneProps {
  const builderOptions = {
    bannerInputRef,
    bannerUploadBusy,
    currentFolder,
    currentFolderBannerUrl,
    fileInputRef,
    fileShareDialogProps,
    folderInputRef,
    folderShareDialogProps,
    isMobile,
    onBannerInputChange,
    onChangeFolderBanner,
    onQueueFiles,
    onQueueFolderFiles,
    onResetFolderBanner,
    searchBarProps,
    ...options,
  };

  return {
    bannerInputRef,
    bannerUploadBusy,
    browseSurfaceProps: buildExplorerBrowseSurfaceProps(builderOptions),
    contentDialogsProps: buildExplorerContentDialogsProps(builderOptions),
    controlsProps: buildExplorerControlsProps(builderOptions),
    currentFolder,
    currentFolderBannerUrl,
    fileInputRef,
    fileShareDialogProps,
    folderInputRef,
    folderShareDialogProps,
    isMobile,
    mobileActionsProps: buildExplorerMobileActionsProps(builderOptions),
    onBannerInputChange,
    onChangeFolderBanner,
    onQueueFiles,
    onQueueFolderFiles,
    onResetFolderBanner,
    searchBarProps,
    shellProps: buildExplorerCanvasShellProps(builderOptions),
  };
}
