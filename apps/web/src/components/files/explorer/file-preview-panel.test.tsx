"use client";

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const {
  FilePreviewMarkdownPaneSurfaceMock,
  FilePreviewPropertiesDialogMock,
  ShareDialogMock,
  useFilePreviewPanelMock,
} = vi.hoisted(() => ({
  FilePreviewMarkdownPaneSurfaceMock: vi.fn(() => (
    <div>FILE_PREVIEW_MARKDOWN_SURFACE</div>
  )),
  FilePreviewPropertiesDialogMock: vi.fn(() => <div>PROPERTIES_DIALOG</div>),
  ShareDialogMock: vi.fn(() => <div>SHARE_DIALOG</div>),
  useFilePreviewPanelMock: vi.fn(),
}));

vi.mock(
  "@/components/files/explorer/file-preview-markdown-pane-surface",
  () => ({
    FilePreviewMarkdownPaneSurface: FilePreviewMarkdownPaneSurfaceMock,
  })
);

vi.mock("@/components/files/explorer/file-preview-properties-dialog", () => ({
  FilePreviewPropertiesDialog: FilePreviewPropertiesDialogMock,
}));

vi.mock("@/components/files/explorer/file-preview-media-pane", () => ({
  FilePreviewMediaPane: () => <div>MEDIA_PANE</div>,
}));

vi.mock("@/components/files/explorer/use-file-preview-panel", () => ({
  useFilePreviewPanel: useFilePreviewPanelMock,
}));

vi.mock("next/dynamic", () => ({
  default: () => ShareDialogMock,
}));

import { ExplorerPreviewPane } from "@/components/files/explorer/explorer-preview-pane";

const removedWrapperFile = resolve(
  import.meta.dirname,
  "./file-preview-panel.tsx"
);
const removedSurfaceFile = resolve(
  import.meta.dirname,
  "./file-preview-panel-surface.tsx"
);
const explorerPreviewPaneSource = resolve(
  import.meta.dirname,
  "./explorer-preview-pane.tsx"
);

describe("ExplorerPreviewPane ready preview branch", () => {
  it("wires preview panel props into the local hook and inline surface without the old wrapper files", () => {
    useFilePreviewPanelMock.mockReturnValue({
      activeFile: {
        id: "file-1",
        name: "notes.md",
        readOnly: false,
      },
      activeFileIsMarkdown: true,
      allFiles: [],
      allFolders: [],
      applyDefaultNoteCover: () => {},
      currentUser: { email: "ada@avenire.local", name: "Ada" },
      derivedState: { isMarkdown: true },
      filePreviewScrollRef: { current: null },
      handleMarkdownBodyChange: () => {},
      handleNoteBannerInputChange: () => {},
      isMarkdownReady: true,
      markdownBody: "# Notes",
      markdownError: null,
      markdownLoading: false,
      mediaModel: null,
      noteBannerInputRef: { current: null },
      noteBannerUploadBusy: false,
      noteBannerUrl: null,
      noteCoverLinkDraft: "",
      noteCoverPickerTab: "gallery",
      noteDisplayTitle: "Notes",
      notePage: { properties: {} },
      noteSaveState: "saved",
      openFileById: () => {},
      openPane: () => {},
      paneId: "pane-1",
      propertiesOpen: false,
      propertyDefinitions: [],
      query: "",
      setAudioLoadFailed: () => {},
      setNoteCoverLinkDraft: () => {},
      setNoteCoverPickerTab: () => {},
      setNotePage: () => {},
      setPropertiesOpen: () => {},
      setPropertyDefinitions: () => {},
      setNoteCoverUrl: () => {},
      setVideoLoadFailed: () => {},
      triggerNoteBannerPicker: () => {},
      wikiLinkableFiles: [],
      workspaceUuid: "workspace-1",
    });

    const html = renderToStaticMarkup(
      <ExplorerPreviewPane
        filePreviewPanelProps={
          {
            activeFile: { id: "file-1" } as never,
            activeRetrievalChunkId: null,
            allFiles: [],
            allFolders: [],
            currentInfoEntries: [],
            deleteContextActionItems: () => {},
            downloadContextActionItems: () => {},
            duplicateContextActionItems: () => {},
            hardReingestContextActionItems: () => {},
            isCurrentPinned: false,
            moveContextActionItemsToFolder: () => {},
            openFileById: () => {},
            openFileShareDialog: () => {},
            openRenameFileDialog: () => {},
            propertyDefinitions: [],
            query: "",
            retrievalResults: [],
            setPropertyDefinitions: () => {},
            startBannerUpload: async () => undefined,
            toggleCurrentPinnedItem: () => {},
            wikiLinkableFiles: [],
            workspaceUuid: "workspace-1",
          } as never
        }
        fileShareDialogProps={{} as never}
        folderShareDialogProps={{} as never}
      />
    );

    expect(useFilePreviewPanelMock).toHaveBeenCalledTimes(1);
    expect(FilePreviewPropertiesDialogMock).toHaveBeenCalledTimes(1);
    expect(FilePreviewMarkdownPaneSurfaceMock).toHaveBeenCalledTimes(1);
    expect(ShareDialogMock).toHaveBeenCalledTimes(2);
    expect(existsSync(removedWrapperFile)).toBe(false);
    expect(existsSync(removedSurfaceFile)).toBe(false);
    expect(html).toContain("FILE_PREVIEW_MARKDOWN_SURFACE");
    expect(html).toContain("PROPERTIES_DIALOG");
  });
});
