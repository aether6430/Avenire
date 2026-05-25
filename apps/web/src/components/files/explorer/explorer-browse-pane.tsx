"use client";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@avenire/ui/components/context-menu";
import { Spinner } from "@avenire/ui/components/spinner";
import { FileImage, XCircle } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import Image from "next/image";
import type { ExplorerBrowsePaneProps } from "@/components/files/explorer/explorer-browse-pane-props-shared";
import type { ExplorerBrowseSurfaceProps } from "@/components/files/explorer/explorer-browse-surface-types";
import type { ExplorerContentDialogsProps } from "@/components/files/explorer/explorer-content-dialogs";
import type { ExplorerMobileActionsProps } from "@/components/files/explorer/explorer-mobile-actions";
import type { ShareDialogProps } from "@/components/files/explorer/share-dialog";
import StylizedSearchBar from "../stylized-search-bar";
import { ExplorerBrowseCards } from "./explorer-browse-cards";
import { ExplorerBrowseList } from "./explorer-browse-list";
import { ExplorerCanvasShell } from "./explorer-canvas-shell";
import { ExplorerControls } from "./explorer-controls";

const ShareDialog = dynamic<ShareDialogProps>(
  () =>
    import("@/components/files/explorer/share-dialog").then(
      (module) => module.ShareDialog
    ),
  { loading: () => null, ssr: false }
);

const ExplorerContentDialogs = dynamic<ExplorerContentDialogsProps>(
  () =>
    import("@/components/files/explorer/explorer-content-dialogs").then(
      (module) => module.ExplorerContentDialogs
    ),
  { loading: () => null, ssr: false }
);

const ExplorerMobileActions = dynamic<ExplorerMobileActionsProps>(
  () =>
    import("@/components/files/explorer/explorer-mobile-actions").then(
      (module) => module.ExplorerMobileActions
    ),
  { loading: () => null, ssr: false }
);

export function ExplorerBrowseSurface(props: ExplorerBrowseSurfaceProps) {
  return (
    <>
      <ExplorerBrowseCards {...props} />
      <ExplorerBrowseList {...props} />
    </>
  );
}

export function ExplorerBrowsePane({
  bannerInputRef,
  bannerUploadBusy,
  browseSurfaceProps,
  contentDialogsProps,
  controlsProps,
  currentFolder,
  currentFolderBannerUrl,
  fileInputRef,
  fileShareDialogProps,
  folderInputRef,
  folderShareDialogProps,
  isMobile,
  mobileActionsProps,
  onBannerInputChange,
  onChangeFolderBanner,
  onQueueFiles,
  onQueueFolderFiles,
  onResetFolderBanner,
  searchBarProps,
  shellProps,
}: ExplorerBrowsePaneProps) {
  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background text-foreground">
      <ShareDialog {...fileShareDialogProps} />
      <ShareDialog {...folderShareDialogProps} />
      <div className="px-4 pt-0 pb-4">
        {currentFolder && !isMobile ? (
          <ContextMenu>
            <ContextMenuTrigger {...({ disabled: isMobile } as any)}>
              <div className="relative -mx-4 mb-3 h-44 w-[calc(100%+2rem)] overflow-hidden">
                <Image
                  alt={`${currentFolder.name} banner`}
                  className="h-full w-full object-cover"
                  fetchPriority="high"
                  height={176}
                  src={currentFolderBannerUrl}
                  unoptimized
                  width={1200}
                />
                {bannerUploadBusy ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-[1px]">
                    <Spinner className="size-5" />
                  </div>
                ) : null}
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className={shellProps.menuSurfaceClass}>
              <ContextMenuItem
                disabled={Boolean(currentFolder.readOnly) || bannerUploadBusy}
                onClick={() => onChangeFolderBanner(currentFolder.id)}
              >
                <FileImage className="size-3.5" />
                Change banner
              </ContextMenuItem>
              <ContextMenuItem
                disabled={Boolean(currentFolder.readOnly) || bannerUploadBusy}
                onClick={() => onResetFolderBanner(currentFolder.id)}
              >
                <XCircle className="size-3.5" />
                Reset banner
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ) : null}
        <StylizedSearchBar {...searchBarProps} />
      </div>

      <input
        className="sr-only"
        multiple
        onChange={(event) => {
          const incoming = Array.from(event.target.files ?? []);
          onQueueFiles(incoming);
          event.currentTarget.value = "";
        }}
        ref={fileInputRef}
        type="file"
      />
      <input
        className="sr-only"
        {...({ directory: "", webkitdirectory: "" } as Record<string, string>)}
        multiple
        onChange={(event) => {
          const incoming = Array.from(event.target.files ?? []).map((file) => {
            const webkitRelativePath = (
              file as File & { webkitRelativePath?: string }
            ).webkitRelativePath;
            return {
              file,
              relativePath: webkitRelativePath || file.name,
            };
          });
          onQueueFolderFiles(incoming);
          event.currentTarget.value = "";
        }}
        ref={folderInputRef}
        type="file"
      />
      <input
        accept="image/*"
        className="sr-only"
        onChange={onBannerInputChange}
        ref={bannerInputRef}
        type="file"
      />

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-24 md:pb-0">
        <ExplorerControls {...controlsProps} />
        <ExplorerCanvasShell {...shellProps}>
          <ExplorerBrowseSurface {...browseSurfaceProps} />
        </ExplorerCanvasShell>
      </div>

      <ExplorerMobileActions {...mobileActionsProps} />
      <ExplorerContentDialogs {...contentDialogsProps} />
    </div>
  );
}
