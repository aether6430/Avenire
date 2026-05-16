import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fileExplorerMock, usePanePathnameMock, workspaceRoutePlaceholderMock } =
  vi.hoisted(() => ({
    fileExplorerMock: vi.fn(() => <div data-file-explorer="1" />),
    usePanePathnameMock: vi.fn(
      () => "/workspace/files/workspace-1/folder/folder-1"
    ),
    workspaceRoutePlaceholderMock: vi.fn(
      ({ label, pending }: { label?: string; pending?: boolean }) => (
        <div
          data-label={label ?? "Loading workspace..."}
          data-pending={String(pending ?? true)}
        />
      )
    ),
  }));

vi.mock("@/components/dashboard/workspace-route-placeholder", () => ({
  WorkspaceRoutePlaceholder: workspaceRoutePlaceholderMock,
}));

vi.mock("@/components/files/explorer", () => ({
  FileExplorer: fileExplorerMock,
}));

vi.mock("@/lib/workspace-panes", () => ({
  usePanePathname: usePanePathnameMock,
}));

import { WorkspaceFolderRoutePageClient } from "@/components/files/workspace-folder-route-page-client";

describe("WorkspaceFolderRoutePageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the file explorer when route params are available", () => {
    const html = renderToStaticMarkup(<WorkspaceFolderRoutePageClient />);

    expect(html).toContain('data-file-explorer="1"');
  });

  it("renders a non-loading unavailable state when folder/workspace params are missing", () => {
    usePanePathnameMock.mockReturnValueOnce("/workspace/files");

    const html = renderToStaticMarkup(<WorkspaceFolderRoutePageClient />);

    expect(html).toContain("This file view isn&#x27;t available.");
    expect(html).toContain('data-pending="false"');
  });
});
