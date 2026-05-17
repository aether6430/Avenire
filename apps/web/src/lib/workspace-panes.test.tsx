import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useRouterMock } = vi.hoisted(() => ({
  useRouterMock: vi.fn(),
}));

const { paneStoreState, useWorkspacePaneStoreMock } = vi.hoisted(() => {
  const paneStoreState = {
    activePaneId: "pane-1",
    focusPane: vi.fn(),
    openPane: vi.fn(),
    setPaneRoute: vi.fn(),
  };

  const useWorkspacePaneStoreMock = Object.assign(
    <T,>(selector: (state: typeof paneStoreState) => T) =>
      selector(paneStoreState),
    {
      getState: () => paneStoreState,
    }
  );

  return { paneStoreState, useWorkspacePaneStoreMock };
});

vi.mock("next/navigation", () => ({
  useRouter: useRouterMock,
}));

vi.mock("@/stores/workspacePaneStore", () => ({
  useWorkspacePaneStore: useWorkspacePaneStoreMock,
}));

import {
  useCurrentWorkspacePane,
  useCurrentWorkspacePaneCompact,
  useOptionalCurrentWorkspacePane,
  usePanePathname,
  usePaneRouter,
  usePaneSearchParams,
  useWorkspacePaneNavigation,
  useWorkspaceSurfaceNavigation,
  WorkspacePaneProvider,
} from "@/lib/workspace-panes";

function renderHookValue<T>(render: () => T) {
  let value: T | null = null;

  function Probe() {
    value = render();
    return null;
  }

  renderToStaticMarkup(<Probe />);

  if (value === null) {
    throw new Error("Hook value was not captured.");
  }

  return value;
}

function renderPaneHookValue<T>(render: () => T) {
  return renderHookValue(() => (
    <WorkspacePaneProvider
      isActive
      isCompact
      paneId="pane-1"
      route={{ pathname: "/workspace/files", search: "?tab=recent" }}
    >
      <PaneProbe render={render} />
    </WorkspacePaneProvider>
  ));
}

function PaneProbe<T>({ render }: { render: () => T }) {
  // eslint-disable-next-line react-compiler/react-compiler
  render();
  return null;
}

describe("workspace panes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("window", {
      location: { origin: "https://app.example.com" },
    });
    useRouterMock.mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
    });
  });

  it("throws when the current pane hook is used outside a provider", () => {
    expect(() =>
      renderHookValue(() => {
        useCurrentWorkspacePane();
        return null;
      })
    ).toThrow("useCurrentWorkspacePane must be used within a pane.");
  });

  it("exposes provider state through the pane hooks", () => {
    let current: ReturnType<typeof useCurrentWorkspacePane> | null = null;
    let compact = false;
    let pathname = "";
    let tab = "";
    let optional: ReturnType<typeof useOptionalCurrentWorkspacePane> | null =
      null;

    function Probe() {
      current = useCurrentWorkspacePane();
      compact = useCurrentWorkspacePaneCompact();
      pathname = usePanePathname();
      tab = usePaneSearchParams().get("tab") ?? "";
      optional = useOptionalCurrentWorkspacePane();
      return null;
    }

    renderToStaticMarkup(
      <WorkspacePaneProvider
        isActive
        isCompact
        paneId="pane-1"
        route={{ pathname: "/workspace/files", search: "?tab=recent" }}
      >
        <Probe />
      </WorkspacePaneProvider>
    );

    expect(current).toMatchObject({
      isActive: true,
      isCompact: true,
      paneId: "pane-1",
      route: { pathname: "/workspace/files", search: "?tab=recent" },
    });
    expect(compact).toBe(true);
    expect(pathname).toBe("/workspace/files");
    expect(tab).toBe("recent");
    expect(optional).toEqual(current);
  });

  it("builds a pane router around the current pane context and store state", () => {
    const router = {
      push: vi.fn(),
      replace: vi.fn(),
    };
    useRouterMock.mockReturnValue(router);

    let paneRouter: ReturnType<typeof usePaneRouter> | null = null;
    function Probe() {
      paneRouter = usePaneRouter();
      return null;
    }

    renderToStaticMarkup(
      <WorkspacePaneProvider
        isActive
        isCompact
        paneId="pane-1"
        route={{ pathname: "/workspace/files", search: "" }}
      >
        <Probe />
      </WorkspacePaneProvider>
    );

    paneRouter?.replace("/workspace/tasks?tab=recent" as never, {
      scroll: true,
    });

    expect(paneStoreState.focusPane).toHaveBeenCalledWith("pane-1");
    expect(paneStoreState.setPaneRoute).toHaveBeenCalledWith(
      "pane-1",
      { pathname: "/workspace/tasks", search: "?tab=recent" },
      { replace: true }
    );
    expect(router.replace).toHaveBeenCalledWith("/workspace/tasks?tab=recent", {
      scroll: true,
    });
  });

  it("builds workspace navigation helpers from pane context and store selectors", () => {
    const router = {
      push: vi.fn(),
      replace: vi.fn(),
    };
    useRouterMock.mockReturnValue(router);

    let paneNavigation: ReturnType<typeof useWorkspacePaneNavigation> | null =
      null;
    let surfaceNavigation: ReturnType<
      typeof useWorkspaceSurfaceNavigation
    > | null = null;

    function Probe() {
      paneNavigation = useWorkspacePaneNavigation();
      surfaceNavigation = useWorkspaceSurfaceNavigation();
      return null;
    }

    renderToStaticMarkup(
      <WorkspacePaneProvider
        isActive
        isCompact
        paneId="pane-1"
        route={{ pathname: "/workspace/files", search: "" }}
      >
        <Probe />
      </WorkspacePaneProvider>
    );

    paneNavigation?.openInNewPane(
      "https://app.example.com/workspace/chats/test"
    );
    surfaceNavigation?.navigate(
      "https://app.example.com/workspace/files?tab=pinned",
      { replace: true }
    );

    expect(paneStoreState.openPane).toHaveBeenCalledWith(
      "/workspace/chats/test",
      { sourcePaneId: "pane-1" }
    );
    expect(paneStoreState.focusPane).toHaveBeenCalledWith("pane-1");
    expect(paneStoreState.setPaneRoute).toHaveBeenCalledWith(
      "pane-1",
      { pathname: "/workspace/files", search: "?tab=pinned" },
      { replace: true }
    );
    expect(router.replace).toHaveBeenCalledWith("/workspace/files?tab=pinned", {
      scroll: false,
    });
  });
});
