import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { FilePreviewMarkdownPaneSurfaceMock } = vi.hoisted(() => ({
  FilePreviewMarkdownPaneSurfaceMock: vi.fn(() => (
    <div>MARKDOWN_PANE_SURFACE</div>
  )),
}));

vi.mock(
  "@/components/files/explorer/file-preview-markdown-pane-surface",
  () => ({
    FilePreviewMarkdownPaneSurface: FilePreviewMarkdownPaneSurfaceMock,
  })
);

import { FilePreviewMarkdownPane } from "@/components/files/explorer/file-preview-markdown-pane";

describe("FilePreviewMarkdownPane", () => {
  it("passes the pane props through to the extracted surface owner", () => {
    const props = {
      activeFileId: "file-1",
      activeFileIsMarkdown: true,
      activeFileName: "notes.md",
      editorCreatedBy: "Ada",
      isMarkdownReady: true,
      isPaneActive: true,
      markdownBody: "# Notes",
      markdownError: null,
      markdownLoading: false,
      noteBannerUploadBusy: false,
      noteBannerUrl: null,
      noteCoverLinkDraft: "",
      noteCoverPickerTab: "gallery",
      noteDisplayTitle: "Lecture Notes",
      onPagePropertiesChange: () => {},
      onPropertyDefinitionsChange: () => {},
      onApplyDefaultNoteCover: () => {},
      onMarkdownBodyChange: () => {},
      onNoteCoverLinkDraftChange: () => {},
      onNoteCoverPickerTabChange: () => {},
      onOpenWikiLink: () => {},
      onSetNoteCoverUrl: () => {},
      onTemplateApplied: () => {},
      onTriggerNoteBannerPicker: () => {},
      pageProperties: {},
      propertyDefinitions: [],
      readOnly: false,
      scrollContainerRef: { current: null },
      wikiPages: [],
      workspaceUuid: "workspace-1",
    };

    const html = renderToStaticMarkup(
      <FilePreviewMarkdownPane {...(props as never)} />
    );

    expect(FilePreviewMarkdownPaneSurfaceMock).toHaveBeenCalledWith(
      props,
      undefined
    );
    expect(html).toContain("MARKDOWN_PANE_SURFACE");
  });
});
