"use client";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { FilePreviewPanelSurfaceMock, useFilePreviewPanelMock } = vi.hoisted(
  () => ({
    FilePreviewPanelSurfaceMock: vi.fn(() => (
      <div>FILE_PREVIEW_PANEL_SURFACE</div>
    )),
    useFilePreviewPanelMock: vi.fn(),
  })
);

vi.mock("@/components/files/explorer/file-preview-panel-surface", () => ({
  FilePreviewPanelSurface: FilePreviewPanelSurfaceMock,
}));

vi.mock("@/components/files/explorer/use-file-preview-panel", () => ({
  useFilePreviewPanel: useFilePreviewPanelMock,
}));

import { FilePreviewPanel } from "@/components/files/explorer/file-preview-panel";

describe("FilePreviewPanel", () => {
  it("wires preview panel props into the local hook and surface", () => {
    useFilePreviewPanelMock.mockReturnValue({ marker: "runtime" });

    const html = renderToStaticMarkup(
      <FilePreviewPanel
        activeFile={{ id: "file-1" } as never}
        activeRetrievalChunkId={null}
        allFiles={[]}
        allFolders={[]}
        currentInfoEntries={[]}
        deleteContextActionItems={() => {}}
        downloadContextActionItems={() => {}}
        duplicateContextActionItems={() => {}}
        hardReingestContextActionItems={() => {}}
        isCurrentPinned={false}
        moveContextActionItemsToFolder={() => {}}
        openFileById={() => {}}
        openFileShareDialog={() => {}}
        openRenameFileDialog={() => {}}
        propertyDefinitions={[]}
        query=""
        retrievalResults={[]}
        setPropertyDefinitions={() => {}}
        startBannerUpload={async () => undefined}
        toggleCurrentPinnedItem={() => {}}
        wikiLinkableFiles={[]}
        workspaceUuid="workspace-1"
      />
    );

    expect(useFilePreviewPanelMock).toHaveBeenCalledTimes(1);
    expect(FilePreviewPanelSurfaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runtime: { marker: "runtime" },
      }),
      undefined
    );
    expect(html).toContain("FILE_PREVIEW_PANEL_SURFACE");
  });
});
