"use client";

import { Spinner } from "@avenire/ui/components/spinner";
import { FileText } from "@phosphor-icons/react";
import type { RefObject } from "react";
import type {
  AvenireEditorProps,
  WikiPage,
} from "@/components/editor/editor-core";
import { FilePreviewMarkdownContent } from "./file-preview-markdown-content";
import { FilePreviewMarkdownCoverSection } from "./file-preview-markdown-cover-section";
import type { MarkdownCoverTab } from "./file-preview-note-shared";

interface FilePreviewMarkdownPaneProps {
  activeFileId: string;
  activeFileIsMarkdown: boolean;
  activeFileName: string;
  editorCreatedBy: string;
  isMarkdownReady: boolean;
  isPaneActive: boolean;
  markdownBody: string;
  markdownError: string | null;
  markdownLoading: boolean;
  noteBannerUploadBusy: boolean;
  noteBannerUrl: string | null;
  noteCoverLinkDraft: string;
  noteCoverPickerTab: MarkdownCoverTab;
  noteDisplayTitle: string;
  noteSaveState?: "idle" | "saving" | "saved" | "error";
  onApplyDefaultNoteCover: () => void;
  onMarkdownBodyChange: (value: string) => void;
  onNoteCoverLinkDraftChange: (value: string) => void;
  onNoteCoverPickerTabChange: (value: MarkdownCoverTab) => void;
  onOpenWikiLink: AvenireEditorProps["onOpenWikiLink"];
  onSetNoteCoverUrl: (url: string | null) => void;
  onTemplateApplied: AvenireEditorProps["onTemplateApplied"];
  onTriggerNoteBannerPicker: () => void;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  wikiPages: WikiPage[];
  workspaceUuid: string;
}

export function FilePreviewMarkdownPane({
  activeFileId,
  activeFileIsMarkdown,
  activeFileName,
  editorCreatedBy,
  isMarkdownReady,
  isPaneActive,
  markdownBody,
  markdownError,
  markdownLoading,
  noteBannerUploadBusy,
  noteBannerUrl,
  noteCoverLinkDraft,
  noteCoverPickerTab,
  noteDisplayTitle,
  noteSaveState,
  onApplyDefaultNoteCover,
  onMarkdownBodyChange,
  onNoteCoverLinkDraftChange,
  onNoteCoverPickerTabChange,
  onOpenWikiLink,
  onSetNoteCoverUrl,
  onTemplateApplied,
  onTriggerNoteBannerPicker,
  scrollContainerRef,
  wikiPages,
  workspaceUuid,
}: FilePreviewMarkdownPaneProps) {
  return (
    <div
      className="no-scrollbar min-h-0 flex-1 overflow-auto"
      ref={scrollContainerRef}
    >
      <div className="h-full">
        {markdownError ? (
          <div className="mx-auto flex h-[70vh] max-w-[820px] flex-col items-center justify-center gap-3 p-0 text-center sm:p-4">
            <FileText className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground text-xs">{markdownError}</p>
          </div>
        ) : markdownLoading || !isMarkdownReady ? (
          <div className="mx-auto flex h-[70vh] max-w-[820px] items-center justify-center p-0 text-muted-foreground text-sm sm:p-4">
            <div className="inline-flex items-center gap-2">
              <Spinner className="size-4" />
              Loading markdown...
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <FilePreviewMarkdownCoverSection
              activeFileIsMarkdown={activeFileIsMarkdown}
              activeFileName={activeFileName}
              noteBannerUploadBusy={noteBannerUploadBusy}
              noteBannerUrl={noteBannerUrl}
              noteCoverLinkDraft={noteCoverLinkDraft}
              noteCoverPickerTab={noteCoverPickerTab}
              onApplyDefaultNoteCover={onApplyDefaultNoteCover}
              onNoteCoverLinkDraftChange={onNoteCoverLinkDraftChange}
              onNoteCoverPickerTabChange={onNoteCoverPickerTabChange}
              onSetNoteCoverUrl={onSetNoteCoverUrl}
              onTriggerNoteBannerPicker={onTriggerNoteBannerPicker}
            />
            <FilePreviewMarkdownContent
              activeFileId={activeFileId}
              editorCreatedBy={editorCreatedBy}
              isPaneActive={isPaneActive}
              markdownBody={markdownBody}
              noteDisplayTitle={noteDisplayTitle}
              noteSaveState={noteSaveState}
              onMarkdownBodyChange={onMarkdownBodyChange}
              onOpenWikiLink={onOpenWikiLink}
              onTemplateApplied={onTemplateApplied}
              scrollContainerRef={scrollContainerRef}
              wikiPages={wikiPages}
              workspaceUuid={workspaceUuid}
            />
          </div>
        )}
      </div>
    </div>
  );
}
