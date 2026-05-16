"use client";

import { Spinner } from "@avenire/ui/components/spinner";
import dynamic from "next/dynamic";
import type { FilePreviewPanelProps } from "@/components/files/explorer/file-preview-panel";
import type { ShareDialogProps } from "@/components/files/explorer/share-dialog";

const FilePreviewPanel = dynamic<FilePreviewPanelProps>(
  () =>
    import("@/components/files/explorer/file-preview-panel").then(
      (module) => module.FilePreviewPanel
    ),
  {
    loading: () => (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center">
        <div className="inline-flex items-center gap-2 text-muted-foreground text-sm">
          <Spinner className="size-4" />
          Loading preview...
        </div>
      </div>
    ),
    ssr: false,
  }
);

const ShareDialog = dynamic<ShareDialogProps>(
  () =>
    import("@/components/files/explorer/share-dialog").then(
      (module) => module.ShareDialog
    ),
  { loading: () => null, ssr: false }
);

export interface ExplorerPreviewPaneProps {
  filePreviewPanelProps: FilePreviewPanelProps;
  fileShareDialogProps: ShareDialogProps;
  folderShareDialogProps: ShareDialogProps;
}

export function ExplorerPreviewPane({
  filePreviewPanelProps,
  fileShareDialogProps,
  folderShareDialogProps,
}: ExplorerPreviewPaneProps) {
  return (
    <>
      <ShareDialog {...fileShareDialogProps} />
      <ShareDialog {...folderShareDialogProps} />
      <FilePreviewPanel {...filePreviewPanelProps} />
    </>
  );
}
