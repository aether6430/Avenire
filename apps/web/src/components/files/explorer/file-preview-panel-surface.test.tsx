"use client";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const {
  FilePreviewMarkdownPaneMock,
  FilePreviewMediaPaneMock,
  FilePreviewPropertiesDialogMock,
} = vi.hoisted(() => ({
  FilePreviewMarkdownPaneMock: vi.fn(() => <div>MARKDOWN_PANE</div>),
  FilePreviewMediaPaneMock: vi.fn(() => <div>MEDIA_PANE</div>),
  FilePreviewPropertiesDialogMock: vi.fn(() => <div>PROPERTIES_DIALOG</div>),
}));

vi.mock("@/components/files/explorer/file-preview-markdown-pane", () => ({
  FilePreviewMarkdownPane: FilePreviewMarkdownPaneMock,
}));

vi.mock("@/components/files/explorer/file-preview-media-pane", () => ({
  FilePreviewMediaPane: FilePreviewMediaPaneMock,
}));

vi.mock("@/components/files/explorer/file-preview-properties-dialog", () => ({
  FilePreviewPropertiesDialog: FilePreviewPropertiesDialogMock,
}));

import { FilePreviewPanelSurface } from "@/components/files/explorer/file-preview-panel-surface";

describe("FilePreviewPanelSurface", () => {
  it("wires inline note property state through the markdown pane", () => {
    const setNotePageMock = vi.fn();
    const setPropertyDefinitionsMock = vi.fn();
    const currentProperties = {
      topic: {
        type: "text" as const,
        value: "ux",
      },
    };
    const nextProperties = {
      topic: {
        type: "text" as const,
        value: "product",
      },
    };

    const html = renderToStaticMarkup(
      <FilePreviewPanelSurface
        runtime={
          {
            activeFile: {
              id: "file-1",
              name: "welcome.md",
              readOnly: true,
            },
            activeFileIsMarkdown: true,
            allFiles: [],
            applyDefaultNoteCover: () => {},
            currentUser: { email: "ada@example.com", name: "Ada" },
            derivedState: { isMarkdown: true },
            filePreviewScrollRef: { current: null },
            handleMarkdownBodyChange: () => {},
            handleNoteBannerInputChange: () => {},
            isMarkdownReady: true,
            isPaneActive: true,
            markdownBody: "# Welcome",
            markdownError: null,
            markdownLoading: false,
            noteBannerInputRef: { current: null },
            noteBannerUploadBusy: false,
            noteBannerUrl: null,
            noteCoverLinkDraft: "",
            noteCoverPickerTab: "gallery",
            noteDisplayTitle: "Welcome to Avenire",
            notePage: {
              bannerUrl: null,
              icon: null,
              properties: currentProperties,
            },
            noteSaveState: "saved",
            openFileById: () => {},
            openPane: () => {},
            paneId: "pane-1",
            propertiesOpen: false,
            propertyDefinitions: [{ key: "topic", options: [], type: "text" }],
            query: "",
            setAudioLoadFailed: () => {},
            setNoteCoverLinkDraft: () => {},
            setNoteCoverPickerTab: () => {},
            setNoteCoverUrl: () => {},
            setNotePage: setNotePageMock,
            setPdfInvertColors: () => {},
            setPropertiesOpen: () => {},
            setPropertyDefinitions: setPropertyDefinitionsMock,
            setVideoLoadFailed: () => {},
            triggerNoteBannerPicker: () => {},
            wikiLinkableFiles: [],
            workspaceUuid: "workspace-1",
          } as never
        }
      />
    );

    expect(FilePreviewPropertiesDialogMock).toHaveBeenCalled();
    expect(FilePreviewPropertiesDialogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: currentProperties,
      }),
      undefined
    );
    expect(FilePreviewMarkdownPaneMock).toHaveBeenCalledWith(
      expect.objectContaining({
        onPagePropertiesChange: expect.any(Function),
        onPropertyDefinitionsChange: setPropertyDefinitionsMock,
        pageProperties: currentProperties,
        propertyDefinitions: [{ key: "topic", options: [], type: "text" }],
        readOnly: true,
      }),
      undefined
    );

    const markdownPaneProps = FilePreviewMarkdownPaneMock.mock.calls[0]?.[0];
    markdownPaneProps.onPagePropertiesChange(nextProperties);

    expect(setNotePageMock).toHaveBeenCalledTimes(1);
    const setNotePageArg = setNotePageMock.mock.calls[0]?.[0];
    expect(
      setNotePageArg({
        bannerUrl: "cover",
        icon: "spark",
        properties: currentProperties,
      })
    ).toEqual({
      bannerUrl: "cover",
      icon: "spark",
      properties: nextProperties,
    });
    expect(html).toContain("MARKDOWN_PANE");
  });
});
