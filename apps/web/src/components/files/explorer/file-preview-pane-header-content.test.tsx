import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  FilePreviewPaneHeaderActions,
  FilePreviewPaneHeaderBreadcrumbs,
  FilePreviewPaneHeaderLeadingIcon,
} from "@/components/files/explorer/file-preview-pane-header-content";

vi.mock("@avenire/ui/components/dropdown-menu", () => {
  const passthrough = ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  );

  return {
    DropdownMenu: passthrough,
    DropdownMenuCheckboxItem: passthrough,
    DropdownMenuContent: passthrough,
    DropdownMenuItem: passthrough,
    DropdownMenuSeparator: passthrough,
    DropdownMenuSub: passthrough,
    DropdownMenuSubContent: passthrough,
    DropdownMenuSubTrigger: passthrough,
    DropdownMenuTrigger: ({
      children,
      render,
    }: {
      children?: ReactNode;
      render?: ReactNode;
    }) => (
      <div>
        {render}
        {children}
      </div>
    ),
  };
});

describe("file preview pane header content", () => {
  it("renders the leading icon and markdown breadcrumb title", () => {
    const leading = renderToStaticMarkup(
      <FilePreviewPaneHeaderLeadingIcon
        activeCustomIcon="M"
        activeLinkSourceUrl={null}
      />
    );
    const breadcrumbs = renderToStaticMarkup(
      <FilePreviewPaneHeaderBreadcrumbs
        activeFileIsMarkdown
        activeFileName="notes.md"
        markdownDisplayTitle="Lecture Notes"
      />
    );

    expect(leading).toContain("M");
    expect(breadcrumbs).toContain("Lecture Notes");
  });

  it("renders the file actions menu labels through the extracted owner", () => {
    const html = renderToStaticMarkup(
      <FilePreviewPaneHeaderActions
        activeFile={
          {
            createdAt: "2026-05-17T00:00:00.000Z",
            id: "file-1",
            name: "notes.pdf",
            updatedAt: "2026-05-17T01:00:00.000Z",
          } as never
        }
        activeFileSourceUrl="https://example.com/notes.pdf"
        allFolders={[{ id: "folder-1", name: "Folder", parentId: null }]}
        canClosePane
        closePane={() => {}}
        currentInfoEntries={[{ label: "Type", value: "PDF" }]}
        deleteContextActionItems={() => {}}
        downloadContextActionItems={() => {}}
        duplicateContextActionItems={() => {}}
        hardReingestContextActionItems={() => {}}
        isCurrentPinned
        isPdf
        moveContextActionItemsToFolder={() => {}}
        openFileShareDialog={() => {}}
        openPane={() => {}}
        openPropertiesDialog={() => {}}
        openRenameFileDialog={() => {}}
        paneId="pane-1"
        pdfInvertColors
        setPdfInvertColors={() => {}}
        toggleCurrentPinnedItem={() => {}}
      />
    );

    expect(html).toContain("PDF dark mode");
    expect(html).toContain("Unpin");
    expect(html).toContain("Metadata");
    expect(html).toContain("Delete");
  });
});
