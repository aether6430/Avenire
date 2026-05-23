"use client";

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const {
  FilePreviewPanelSurfaceMock,
  ShareDialogMock,
  useFilePreviewPanelMock,
} = vi.hoisted(() => ({
  FilePreviewPanelSurfaceMock: vi.fn(() => (
    <div>FILE_PREVIEW_PANEL_SURFACE</div>
  )),
  ShareDialogMock: vi.fn(() => <div>SHARE_DIALOG</div>),
  useFilePreviewPanelMock: vi.fn(),
}));

vi.mock("@/components/files/explorer/file-preview-panel-surface", () => ({
  FilePreviewPanelSurface: FilePreviewPanelSurfaceMock,
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

describe("ExplorerPreviewPane ready preview branch", () => {
  it("wires preview panel props into the local hook and surface without the old wrapper file", () => {
    useFilePreviewPanelMock.mockReturnValue({ marker: "runtime" });

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
    expect(FilePreviewPanelSurfaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runtime: { marker: "runtime" },
      }),
      undefined
    );
    expect(ShareDialogMock).toHaveBeenCalledTimes(2);
    expect(existsSync(removedWrapperFile)).toBe(false);
    expect(html).toContain("FILE_PREVIEW_PANEL_SURFACE");
  });
});
