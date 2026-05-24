import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  hasHydratedWorkspacePaneStore,
  subscribeWorkspacePaneHydration,
} from "@/components/dashboard/use-workspace-pane-browser-sync";
import { WorkspacePaneRenderer } from "@/components/dashboard/workspace-pane-renderer";

const {
  useWorkspacePaneRendererMock,
  useWorkspacePaneStoreMock,
  workspacePaneDesktopLayoutMock,
  workspacePaneMobileLayoutMock,
  workspaceRoutePlaceholderMock,
} = vi.hoisted(() => ({
  useWorkspacePaneRendererMock: vi.fn(),
  useWorkspacePaneStoreMock: {
    persist: undefined as
      | undefined
      | {
          hasHydrated: () => boolean;
          onFinishHydration: (callback: () => void) => () => void;
        },
  },
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

vi.mock("@/stores/workspacePaneStore", () => ({
  useWorkspacePaneStore: useWorkspacePaneStoreMock,
}));

const workspacePaneSurfaceSource = readFileSync(
  resolve(import.meta.dirname, "./workspace-pane-layout.tsx"),
  "utf8"
);

describe("WorkspacePaneRenderer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspacePaneStoreMock.persist = undefined;
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

  it("fails closed when the pane store persist api is unavailable and delegates when hydration helpers exist", () => {
    const callback = vi.fn();
    const unsubscribe = subscribeWorkspacePaneHydration(callback);

    expect(hasHydratedWorkspacePaneStore()).toBe(false);
    expect(typeof unsubscribe).toBe("function");
    unsubscribe();
    expect(callback).not.toHaveBeenCalled();

    const delegatedCallback = vi.fn();
    const delegatedUnsubscribe = vi.fn();

    useWorkspacePaneStoreMock.persist = {
      hasHydrated: () => true,
      onFinishHydration: (handler) => {
        handler();
        return delegatedUnsubscribe;
      },
    };

    const stop = subscribeWorkspacePaneHydration(delegatedCallback);

    expect(hasHydratedWorkspacePaneStore()).toBe(true);
    expect(delegatedCallback).toHaveBeenCalledTimes(1);
    stop();
    expect(delegatedUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("omits the generic close-pane action when the layout only has one pane", () => {
    expect(workspacePaneSurfaceSource).toContain("{isMultiPane ? (");
    expect(workspacePaneSurfaceSource).toContain("Close pane");
  });
});
