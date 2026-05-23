"use client";

import dynamic from "next/dynamic";
import { FilePreviewPanelSurface } from "@/components/files/explorer/file-preview-panel-surface";
import type { FilePreviewPanelProps } from "@/components/files/explorer/file-preview-panel-types";
import type { ShareDialogProps } from "@/components/files/explorer/share-dialog";
import { useFilePreviewPanel } from "@/components/files/explorer/use-file-preview-panel";

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

function ReadyFilePreviewPanel(props: FilePreviewPanelProps) {
  const runtime = useFilePreviewPanel(props);

  return <FilePreviewPanelSurface runtime={runtime} />;
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
      <ReadyFilePreviewPanel {...filePreviewPanelProps} />
    </>
  );
}
