import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  useWorkspacePaneRendererMock,
  workspacePaneDesktopLayoutMock,
  workspacePaneMobileLayoutMock,
  workspaceRoutePlaceholderMock,
} = vi.hoisted(() => ({
  useWorkspacePaneRendererMock: vi.fn(),
  workspacePaneDesktopLayoutMock: vi.fn(() =>
    createElement("div", { "data-pane-desktop": "1" })
  ),
  workspacePaneMobileLayoutMock: vi.fn(() =>
    createElement("div", { "data-pane-mobile": "1" })
  ),
  workspaceRoutePlaceholderMock: vi.fn(
    ({ label, pending }: { label?: string; pending?: boolean }) =>
      createElement("div", {
        "data-label": label ?? "Loading workspace...",
        "data-pending": String(pending ?? true),
      })
  ),
}));

vi.mock("@/components/dashboard/use-workspace-pane-renderer", () => ({
  useWorkspacePaneRenderer: useWorkspacePaneRendererMock,
}));

vi.mock("@/components/dashboard/workspace-pane-layout", () => ({
  WorkspacePaneDesktopLayout: workspacePaneDesktopLayoutMock,
  WorkspacePaneMobileLayout: workspacePaneMobileLayoutMock,
}));

vi.mock("@/components/dashboard/workspace-route-placeholder", () => ({
  WorkspaceRoutePlaceholder: workspaceRoutePlaceholderMock,
}));

import { WorkspacePaneRenderer } from "@/components/dashboard/workspace-pane-renderer";

describe("WorkspacePaneRenderer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a non-loading unavailable state when workspace bootstrap fails", () => {
    useWorkspacePaneRendererMock.mockReturnValue({
      panes: [],
      status: "error",
      workspace: null,
    });

    const html = renderToStaticMarkup(createElement(WorkspacePaneRenderer));

    expect(html).toContain('data-label="Unable to load workspace."');
    expect(html).toContain('data-pending="false"');
  });

  it("shows a non-loading no-workspace state when the user is signed in without a workspace", () => {
    useWorkspacePaneRendererMock.mockReturnValue({
      panes: [],
      status: "ready",
      workspace: null,
    });

    const html = renderToStaticMarkup(createElement(WorkspacePaneRenderer));

    expect(html).toContain('data-label="Create a workspace to continue."');
    expect(html).toContain('data-pending="false"');
  });

  it("keeps the loading placeholder only for the real pending path", () => {
    useWorkspacePaneRendererMock.mockReturnValue({
      panes: [],
      status: "loading",
      workspace: null,
    });

    const html = renderToStaticMarkup(createElement(WorkspacePaneRenderer));

    expect(html).toContain('data-label="Loading workspace..."');
    expect(html).toContain('data-pending="true"');
  });
});
