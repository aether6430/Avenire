import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  useRouterMock,
  useWorkspaceBootstrapMock,
  workspaceRoutePlaceholderMock,
} = vi.hoisted(() => ({
  useRouterMock: vi.fn(() => ({ replace: vi.fn() })),
  useWorkspaceBootstrapMock: vi.fn(),
  workspaceRoutePlaceholderMock: vi.fn(
    ({ label, pending }: { label?: string; pending?: boolean }) => (
      <div
        data-label={label ?? "Loading workspace..."}
        data-pending={String(pending ?? true)}
      />
    )
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: useRouterMock,
}));

vi.mock("@/components/dashboard/workspace-bootstrap", () => ({
  useWorkspaceBootstrap: useWorkspaceBootstrapMock,
}));

vi.mock("@/components/dashboard/workspace-route-placeholder", () => ({
  WorkspaceRoutePlaceholder: workspaceRoutePlaceholderMock,
}));

import { WorkspaceFilesRootPageClient } from "./workspace-files-root-page-client";

describe("WorkspaceFilesRootPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a non-loading unavailable state when bootstrap fails", () => {
    useWorkspaceBootstrapMock.mockReturnValue({
      status: "error",
      workspace: null,
      workspaces: [],
    });

    const html = renderToStaticMarkup(<WorkspaceFilesRootPageClient />);

    expect(html).toContain('data-label="Unable to load files."');
    expect(html).toContain('data-pending="false"');
  });

  it("renders a non-loading not-found state when no workspace can be resolved", () => {
    useWorkspaceBootstrapMock.mockReturnValue({
      status: "ready",
      workspace: null,
      workspaces: [],
    });

    const html = renderToStaticMarkup(<WorkspaceFilesRootPageClient />);

    expect(html).toContain('data-label="Workspace not found."');
    expect(html).toContain('data-pending="false"');
  });

  it("renders a non-loading unavailable state when the target workspace has no root folder", () => {
    useWorkspaceBootstrapMock.mockReturnValue({
      status: "ready",
      workspace: {
        rootFolderId: null,
        workspaceId: "workspace-1",
      },
      workspaces: [],
    });

    const html = renderToStaticMarkup(<WorkspaceFilesRootPageClient />);

    expect(html).toContain('data-label="Workspace files unavailable."');
    expect(html).toContain('data-pending="false"');
  });

  it("renders a real loading state while the root files route is still resolving", () => {
    useWorkspaceBootstrapMock.mockReturnValue({
      status: "loading",
      workspace: null,
      workspaces: [],
    });

    const html = renderToStaticMarkup(<WorkspaceFilesRootPageClient />);

    expect(html).toContain('data-label="Loading files..."');
    expect(html).toContain('data-pending="true"');
  });
});
