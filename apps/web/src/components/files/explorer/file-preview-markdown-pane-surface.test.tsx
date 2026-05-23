"use client";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { AvenireEditorMock } = vi.hoisted(() => ({
  AvenireEditorMock: vi.fn(() => <div>EDITOR</div>),
}));

vi.mock("next/dynamic", () => ({
  default: () => AvenireEditorMock,
}));

import { FilePreviewMarkdownPaneSurface } from "@/components/files/explorer/file-preview-markdown-pane-surface";

describe("FilePreviewMarkdownPaneSurface", () => {
  it("passes note property state into the editor", () => {
    const onPagePropertiesChange = vi.fn();
    const onPropertyDefinitionsChange = vi.fn();

    const html = renderToStaticMarkup(
      <FilePreviewMarkdownPaneSurface
        {...({
          activeFileId: "file-1",
          activeFileIsMarkdown: true,
          activeFileName: "welcome.md",
          editorCreatedBy: "Ada",
          isMarkdownReady: true,
          isPaneActive: true,
          markdownBody: "# Welcome",
          markdownError: null,
          markdownLoading: false,
          noteBannerUploadBusy: false,
          noteBannerUrl: null,
          noteCoverLinkDraft: "",
          noteCoverPickerTab: "gallery",
          noteDisplayTitle: "Welcome to Avenire",
          noteSaveState: "saved",
          onApplyDefaultNoteCover: () => {},
          onMarkdownBodyChange: () => {},
          onNoteCoverLinkDraftChange: () => {},
          onNoteCoverPickerTabChange: () => {},
          onOpenWikiLink: () => {},
          onPagePropertiesChange,
          onPropertyDefinitionsChange,
          onSetNoteCoverUrl: () => {},
          onTriggerNoteBannerPicker: () => {},
          pageProperties: {
            topic: {
              type: "text",
              value: "ux",
            },
          },
          propertyDefinitions: [{ key: "topic", options: [], type: "text" }],
          readOnly: true,
          scrollContainerRef: { current: null },
          wikiPages: [],
          workspaceUuid: "workspace-1",
        } as never)}
      />
    );

    expect(AvenireEditorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        createdBy: "Ada",
        defaultValue: "# Welcome",
        noteTitle: "Welcome to Avenire",
        onPagePropertiesChange,
        onPropertyDefinitionsChange,
        pageProperties: {
          topic: {
            type: "text",
            value: "ux",
          },
        },
        propertyDefinitions: [{ key: "topic", options: [], type: "text" }],
        readOnly: true,
      }),
      undefined
    );
    expect(html).toContain("EDITOR");
  });

  it("keeps the editor mounted even when the pane is inactive", () => {
    const html = renderToStaticMarkup(
      <FilePreviewMarkdownPaneSurface
        {...({
          activeFileId: "file-2",
          activeFileIsMarkdown: true,
          activeFileName: "dormant.md",
          editorCreatedBy: "Ada",
          isMarkdownReady: true,
          isPaneActive: false,
          markdownBody: "# Dormant",
          markdownError: null,
          markdownLoading: false,
          noteBannerUploadBusy: false,
          noteBannerUrl: null,
          noteCoverLinkDraft: "",
          noteCoverPickerTab: "gallery",
          noteDisplayTitle: "Dormant Note",
          onApplyDefaultNoteCover: () => {},
          onMarkdownBodyChange: () => {},
          onNoteCoverLinkDraftChange: () => {},
          onNoteCoverPickerTabChange: () => {},
          onOpenWikiLink: () => {},
          onPagePropertiesChange: () => {},
          onPropertyDefinitionsChange: () => {},
          onSetNoteCoverUrl: () => {},
          onTriggerNoteBannerPicker: () => {},
          pageProperties: {},
          propertyDefinitions: [],
          readOnly: false,
          scrollContainerRef: { current: null },
          wikiPages: [],
          workspaceUuid: "workspace-1",
        } as never)}
      />
    );

    expect(AvenireEditorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultValue: "# Dormant",
        noteTitle: "Dormant Note",
      }),
      undefined
    );
    expect(html).toContain("EDITOR");
    expect(html).not.toContain("Loading markdown...");
  });
});
