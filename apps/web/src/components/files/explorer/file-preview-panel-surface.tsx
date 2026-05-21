"use client";

import { FilePreviewMarkdownPane } from "./file-preview-markdown-pane";
import { FilePreviewMediaPane } from "./file-preview-media-pane";
import { FilePreviewPropertiesDialog } from "./file-preview-properties-dialog";
import type { FilePreviewPanelRuntime } from "./use-file-preview-panel";

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
        <FilePreviewMarkdownPane
          activeFileId={runtime.activeFile.id}
          activeFileIsMarkdown={runtime.activeFileIsMarkdown}
          activeFileName={runtime.activeFile.name}
          editorCreatedBy={
            runtime.currentUser?.name?.trim() ||
            runtime.currentUser?.email?.trim() ||
            ""
          }
          isMarkdownReady={runtime.isMarkdownReady}
          isPaneActive={runtime.isPaneActive}
          markdownBody={runtime.markdownBody}
          markdownError={runtime.markdownError}
          markdownLoading={runtime.markdownLoading}
          noteBannerUploadBusy={runtime.noteBannerUploadBusy}
          noteBannerUrl={runtime.noteBannerUrl}
          noteCoverLinkDraft={runtime.noteCoverLinkDraft}
          noteCoverPickerTab={runtime.noteCoverPickerTab}
          noteDisplayTitle={runtime.noteDisplayTitle}
          onPagePropertiesChange={(properties) => {
            runtime.setNotePage((current) => ({
              ...current,
              properties,
            }));
          }}
          onPropertyDefinitionsChange={runtime.setPropertyDefinitions}
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
          onSetNoteCoverUrl={runtime.setNoteCoverUrl}
          onTemplateApplied={(template) => {
            runtime.setNoteCoverUrl(template.bannerUrl);
          }}
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
          circleToAiEnabled={runtime.circleToAiEnabled}
          fallbackHighlightText={runtime.query}
          fileName={runtime.activeFile.name}
          model={runtime.mediaModel}
          onAudioError={() => {
            runtime.setAudioLoadFailed(true);
          }}
          onCircleToAiEnabledChange={runtime.setCircleToAiEnabled}
          onVideoError={() => {
            runtime.setVideoLoadFailed(true);
          }}
          pdfInvertColors={runtime.pdfInvertColors}
          workspaceUuid={runtime.workspaceUuid}
        />
      )}
    </div>
  );
}
