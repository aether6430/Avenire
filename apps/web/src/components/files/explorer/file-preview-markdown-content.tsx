import { Spinner } from "@avenire/ui/components/spinner";
import dynamic from "next/dynamic";
import type { RefObject } from "react";
import { Markdown } from "@/components/chat/markdown";
import type {
  AvenireEditorProps,
  WikiPage,
} from "@/components/editor/editor-core";

const AvenireEditor = dynamic(() => import("@/components/editor"), {
  loading: () => (
    <div className="mx-auto flex h-[70vh] max-w-[820px] items-center justify-center p-0 text-muted-foreground text-sm sm:p-4">
      <div className="inline-flex items-center gap-2">
        <Spinner className="size-4" />
        Loading editor...
      </div>
    </div>
  ),
  ssr: false,
});

function InactiveMarkdownPreview({
  content,
  fileId,
  workspaceUuid,
}: {
  content: string;
  fileId: string;
  workspaceUuid: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[45rem] px-4 py-8 sm:px-10 sm:py-10">
      <Markdown
        className="text-sm"
        content={content}
        id={`inactive-note-preview:${fileId}`}
        parseIncompleteMarkdown={false}
        workspaceUuid={workspaceUuid}
      />
    </div>
  );
}

interface FilePreviewMarkdownContentProps {
  activeFileId: string;
  editorCreatedBy: string;
  isPaneActive: boolean;
  markdownBody: string;
  noteDisplayTitle: string;
  noteSaveState?: "idle" | "saving" | "saved" | "error";
  onMarkdownBodyChange: (value: string) => void;
  onOpenWikiLink: AvenireEditorProps["onOpenWikiLink"];
  onTemplateApplied: AvenireEditorProps["onTemplateApplied"];
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  wikiPages: WikiPage[];
  workspaceUuid: string;
}

export function FilePreviewMarkdownContent({
  activeFileId,
  editorCreatedBy,
  isPaneActive,
  markdownBody,
  noteDisplayTitle,
  noteSaveState,
  onMarkdownBodyChange,
  onOpenWikiLink,
  onTemplateApplied,
  scrollContainerRef,
  wikiPages,
  workspaceUuid,
}: FilePreviewMarkdownContentProps) {
  if (!isPaneActive) {
    return (
      <InactiveMarkdownPreview
        content={markdownBody}
        fileId={activeFileId}
        workspaceUuid={workspaceUuid}
      />
    );
  }

  return (
    <AvenireEditor
      createdBy={editorCreatedBy}
      defaultValue={markdownBody}
      key={activeFileId}
      noteTitle={noteDisplayTitle}
      onChange={onMarkdownBodyChange}
      onOpenWikiLink={onOpenWikiLink}
      onTemplateApplied={onTemplateApplied}
      saveState={noteSaveState}
      scrollContainerRef={scrollContainerRef}
      wikiPages={wikiPages}
      workspaceUuid={workspaceUuid}
    />
  );
}
