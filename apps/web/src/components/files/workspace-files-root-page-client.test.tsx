import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  usePaneRouterMock,
  usePaneSearchParamsMock,
  useWorkspaceBootstrapMock,
  workspaceRoutePlaceholderMock,
} = vi.hoisted(() => ({
  usePaneRouterMock: vi.fn(() => ({ replace: vi.fn() })),
  usePaneSearchParamsMock: vi.fn(() => new URLSearchParams("")),
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

vi.mock("@/lib/workspace-panes", () => ({
  usePaneRouter: usePaneRouterMock,
  usePaneSearchParams: usePaneSearchParamsMock,
}));

vi.mock("@/components/dashboard/workspace-bootstrap", () => ({
  useWorkspaceBootstrap: useWorkspaceBootstrapMock,
}));

vi.mock("@/components/dashboard/workspace-route-placeholder", () => ({
  WorkspaceRoutePlaceholder: workspaceRoutePlaceholderMock,
}));

import {
  buildWorkspaceFilesRootRoute,
  WorkspaceFilesRootPageClient,
} from "./workspace-files-root-page-client";

describe("WorkspaceFilesRootPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePaneSearchParamsMock.mockReturnValue(new URLSearchParams(""));
  });

  it("preserves pane search params when building the folder redirect route", () => {
    expect(
      buildWorkspaceFilesRootRoute({
        rootFolderId: "root-1",
        search: "file=file-1&overlay=settings",
        workspaceId: "workspace-1",
      })
    ).toBe(
      "/workspace/files/workspace-1/folder/root-1?file=file-1&overlay=settings"
    );
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
