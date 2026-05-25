"use client";

import dynamic from "next/dynamic";
import type { FilePreviewPanelProps } from "@/components/files/explorer/file-preview-panel-types";
import type { ShareDialogProps } from "@/components/files/explorer/share-dialog";
import { useFilePreviewPanel } from "@/components/files/explorer/use-file-preview-panel";
import { FilePreviewMarkdownPaneSurface } from "./file-preview-markdown-pane-surface";
import { FilePreviewMediaPane } from "./file-preview-media-pane";
import { FilePreviewPropertiesDialog } from "./file-preview-properties-dialog";
import type { FilePreviewPanelRuntime } from "./use-file-preview-panel";

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

export function FilePreviewPanelSurface({
  runtime,
}: {
  runtime: FilePreviewPanelRuntime;
}) {
  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <FilePreviewPropertiesDialog
        activeFileIsMarkdown={runtime.activeFileIsMarkdown}
        definitions={runtime.propertyDefinitions}
        noteBannerInputRef={runtime.noteBannerInputRef}
        onBannerInputChange={runtime.handleNoteBannerInputChange}
        onDefinitionsChange={runtime.setPropertyDefinitions}
        onOpenChange={runtime.setPropertiesOpen}
        onPropertiesChange={(properties) => {
          runtime.setNotePage((current) => ({
            ...current,
            properties,
          }));
        }}
        open={runtime.propertiesOpen}
        properties={runtime.notePage.properties}
        readOnly={Boolean(runtime.activeFile.readOnly)}
      />
      {runtime.derivedState.isMarkdown ? (
        <FilePreviewMarkdownPaneSurface
          activeFileId={runtime.activeFile.id}
          activeFileIsMarkdown={runtime.activeFileIsMarkdown}
          activeFileName={runtime.activeFile.name}
          editorCreatedBy={
            runtime.currentUser?.name?.trim() ||
            runtime.currentUser?.email?.trim() ||
            ""
          }
          isMarkdownReady={runtime.isMarkdownReady}
          markdownBody={runtime.markdownBody}
          markdownError={runtime.markdownError}
          markdownLoading={runtime.markdownLoading}
          noteBannerUploadBusy={runtime.noteBannerUploadBusy}
          noteBannerUrl={runtime.noteBannerUrl}
          noteCoverLinkDraft={runtime.noteCoverLinkDraft}
          noteCoverPickerTab={runtime.noteCoverPickerTab}
          noteDisplayTitle={runtime.noteDisplayTitle}
          noteSaveState={
            runtime.activeFileIsMarkdown ? runtime.noteSaveState : undefined
          }
          onApplyDefaultNoteCover={runtime.applyDefaultNoteCover}
          onMarkdownBodyChange={runtime.handleMarkdownBodyChange}
          onNoteCoverLinkDraftChange={runtime.setNoteCoverLinkDraft}
          onNoteCoverPickerTabChange={runtime.setNoteCoverPickerTab}
          onOpenWikiLink={(page, options) => {
            if (!options.openInNewPane) {
              runtime.openFileById(page.id);
              return;
            }

            const targetFile = runtime.allFiles.find(
              (file) => file.id === page.id
            );
            if (!targetFile) {
              return;
            }

            const params = new URLSearchParams();
            params.set("file", page.id);
            runtime.openPane(
              `/workspace/files/${runtime.workspaceUuid}/folder/${targetFile.folderId}?${params.toString()}`,
              { sourcePaneId: runtime.paneId }
            );
          }}
          onPagePropertiesChange={(properties) => {
            runtime.setNotePage((current) => ({
              ...current,
              properties,
            }));
          }}
          onPropertyDefinitionsChange={runtime.setPropertyDefinitions}
          onSetNoteCoverUrl={runtime.setNoteCoverUrl}
          onTriggerNoteBannerPicker={runtime.triggerNoteBannerPicker}
          pageProperties={runtime.notePage.properties}
          propertyDefinitions={runtime.propertyDefinitions}
          readOnly={Boolean(runtime.activeFile.readOnly)}
          scrollContainerRef={runtime.filePreviewScrollRef}
          wikiPages={runtime.wikiLinkableFiles}
          workspaceUuid={runtime.workspaceUuid}
        />
      ) : (
        <FilePreviewMediaPane
          fallbackHighlightText={runtime.query}
          fileName={runtime.activeFile.name}
          model={runtime.mediaModel}
          onAudioError={() => {
            runtime.setAudioLoadFailed(true);
          }}
          onVideoError={() => {
            runtime.setVideoLoadFailed(true);
          }}
          pdfInvertColors={runtime.pdfInvertColors}
        />
      )}
    </div>
  );
}

export function ExplorerPreviewPane({
  filePreviewPanelProps,
  fileShareDialogProps,
  folderShareDialogProps,
}: ExplorerPreviewPaneProps) {
  const runtime = useFilePreviewPanel(filePreviewPanelProps);

  return (
    <>
      <ShareDialog {...fileShareDialogProps} />
      <ShareDialog {...folderShareDialogProps} />
      <FilePreviewPanelSurface runtime={runtime} />
    </>
  );
}
