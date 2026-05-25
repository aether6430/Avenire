import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPaneRouter,
  createWorkspaceSurfaceNavigator,
  findNavigableAnchor,
  navigateWorkspacePane,
  type WorkspacePaneContextValue,
} from "@/lib/workspace-pane-runtime";

const workspacePaneRuntimeSource = readFileSync(
  resolve(import.meta.dirname, "./workspace-pane-runtime.ts"),
  "utf8"
);
const workspacePaneBrowserNavigationSource = readFileSync(
  resolve(import.meta.dirname, "./workspace-pane-browser-navigation.ts"),
  "utf8"
);

function createRouterMock() {
  return {
    push: vi.fn(),
    replace: vi.fn(),
  };
}

function createStoreMock() {
  return {
    focusPane: vi.fn(),
    openPane: vi.fn(),
    setPaneRoute: vi.fn(),
  };
}

const pane: WorkspacePaneContextValue = {
  isActive: true,
  isCompact: false,
  paneId: "pane-1",
  route: { pathname: "/workspace/files", search: "" },
};

describe("workspace pane runtime", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("window", {
      location: { origin: "https://app.example.com" },
    });
  });

  it("navigates panes and respects open-in-new-pane behavior", () => {
    const router = createRouterMock();
    const store = createStoreMock();

    navigateWorkspacePane(
      router as never,
      pane,
      store,
      "https://app.example.com/workspace/chats/test"
    );
    expect(store.focusPane).toHaveBeenCalledWith("pane-1");
    expect(router.push).toHaveBeenCalledWith("/workspace/chats/test", {
      scroll: false,
    });

    navigateWorkspacePane(
      router as never,
      pane,
      store,
      "https://app.example.com/workspace/chats/test",
      { openInNewPane: true }
    );
    expect(store.openPane).toHaveBeenCalled();
  });

  it("builds pane routers and surface navigators around route state", () => {
    const router = createRouterMock();
    const store = createStoreMock();
    const paneRouter = createPaneRouter(router as never, pane, store);

    paneRouter.replace("/workspace/files?tab=recent" as never, {
      scroll: true,
    });
    expect(router.replace).toHaveBeenCalledWith("/workspace/files?tab=recent", {
      scroll: true,
    });

    const navigator = createWorkspaceSurfaceNavigator({
      activePaneId: "pane-1",
      focusPane: store.focusPane,
      openPane: store.openPane,
      panesEnabled: true,
      router: router as never,
      setPaneRoute: store.setPaneRoute,
    });
    navigator.navigate("https://app.example.com/workspace/files?tab=pinned", {
      replace: true,
    });
    expect(store.setPaneRoute).toHaveBeenCalledWith(
      "pane-1",
      { pathname: "/workspace/files", search: "?tab=pinned" },
      { replace: true }
    );
  });

  it("filters navigable anchors to internal non-download workspace links", () => {
    class AnchorMock {
      _href = "/workspace/files";
      target = "";
      download = false;
      closest() {
        return this;
      }
      getAttribute(name: string) {
        return name === "href" ? this._href : null;
      }
      hasAttribute(name: string) {
        return name === "download" ? this.download : false;
      }
      get href() {
        return `https://app.example.com${this._href}`;
      }
    }
    vi.stubGlobal("HTMLElement", AnchorMock);
    vi.stubGlobal("HTMLAnchorElement", AnchorMock);

    const good = new AnchorMock();
    expect(findNavigableAnchor(good)).toBe(good);

    const external = new AnchorMock();
    external._href = "https://example.com";
    expect(findNavigableAnchor(external)).toBeNull();

    const download = new AnchorMock();
    download.download = true;
    expect(findNavigableAnchor(download)).toBeNull();
  });

  it("keeps browser-route deferral in the dedicated browser-navigation helper instead of inlining it into pane runtime entrypoints", () => {
    expect(workspacePaneRuntimeSource).toContain(
      "@/lib/workspace-pane-browser-navigation"
    );
    expect(workspacePaneRuntimeSource).toContain(
      "markPendingWorkspaceBrowserNavigation"
    );
    expect(workspacePaneRuntimeSource).not.toContain(
      "PENDING_BROWSER_NAVIGATION_TTL_MS"
    );
    expect(workspacePaneRuntimeSource).not.toContain(
      "pendingWorkspaceBrowserNavigation"
    );

    expect(workspacePaneBrowserNavigationSource).toContain(
      "PENDING_BROWSER_NAVIGATION_TTL_MS"
    );
    expect(workspacePaneBrowserNavigationSource).toContain(
      "pendingWorkspaceBrowserNavigation"
    );
  });
});
