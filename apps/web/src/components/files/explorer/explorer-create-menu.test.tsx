import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ExplorerCreateMenu } from "@/components/files/explorer/explorer-create-menu";

const baseProps = {
  currentFolderId: "folder-1",
  isCurrentFolderReadOnly: false,
  menuSurfaceClass: "",
  onCreateFolder: vi.fn(),
  onCreateNote: vi.fn(),
  onImportLink: vi.fn(),
  onOpenMobileCreateMenu: vi.fn(),
  onUploadFile: vi.fn(),
  onUploadFolder: vi.fn(),
};

describe("ExplorerCreateMenu", () => {
  it("names the desktop create trigger", () => {
    const html = renderToStaticMarkup(
      <ExplorerCreateMenu {...baseProps} isMobile={false} />
    );

    expect(html).toContain('aria-label="Create file or folder"');
    expect(html).toContain('title="Create"');
  });

  it("names the mobile create trigger", () => {
    const html = renderToStaticMarkup(
      <ExplorerCreateMenu {...baseProps} isMobile />
    );

    expect(html).toContain('aria-label="Create file or folder"');
    expect(html).toContain('title="Create"');
  });
});
