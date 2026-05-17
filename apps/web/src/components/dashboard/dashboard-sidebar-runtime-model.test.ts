import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deriveActiveChatSlugFromPath,
  deriveCurrentFlashcardSetId,
  deriveCurrentFolderId,
  deriveDashboardSidebarRouteView,
  deriveRouteWorkspaceUuid,
  getNextMountedDashboardSidebarViews,
  isTypingTarget,
  parseDashboardSidebarResponse,
  resolveDashboardSidebarActiveTabValue,
  resolveDashboardSidebarSurfaceView,
  resolveInitialDashboardSidebarView,
  resolveInitialMountedDashboardSidebarViews,
  resolveSidebarWorkspaceUuid,
  sendDashboardSidebarChatSessionClose,
  shouldSeedPreferredWorkspaceId,
  shouldSyncRouteWorkspacePreference,
} from "@/components/dashboard/dashboard-sidebar-runtime-model";

describe("dashboard sidebar runtime model", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("derives the active view and route payloads from workspace paths", () => {
    expect(
      deriveDashboardSidebarRouteView({
        isChatsRoute: false,
        pathname: "/workspace/files/ws-1/folder/folder-9?file=file-2",
      })
    ).toBe("files");
    expect(
      deriveDashboardSidebarRouteView({
        isChatsRoute: true,
        pathname: "/workspace/chats/chat-1",
      })
    ).toBe("chat");
    expect(
      deriveDashboardSidebarRouteView({
        isChatsRoute: false,
        pathname: "/workspace",
      })
    ).toBe("workspace");

    expect(deriveActiveChatSlugFromPath("/workspace/chats/chat-9?pane=1")).toBe(
      "chat-9"
    );
    expect(deriveActiveChatSlugFromPath("/workspace/chats/new")).toBe("");

    expect(deriveCurrentFlashcardSetId("/workspace/flashcards/set-7")).toBe(
      "set-7"
    );
    expect(deriveCurrentFolderId("/workspace/files/ws-1/folder/folder-9")).toBe(
      "folder-9"
    );
    expect(
      deriveRouteWorkspaceUuid("/workspace/files/ws-1/folder/folder-9")
    ).toBe("ws-1");
  });

  it("resolves sidebar workspace precedence explicitly", () => {
    const workspaces = [
      {
        name: "Workspace One",
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
      {
        name: "Workspace Two",
        rootFolderId: "root-2",
        workspaceId: "workspace-2",
      },
    ];

    expect(
      resolveSidebarWorkspaceUuid({
        activeChatWorkspaceId: "chat-workspace",
        activeWorkspaceId: "active-workspace",
        preferredWorkspaceId: "preferred-workspace",
        routeWorkspaceUuid: "route-workspace",
        workspaces,
      })
    ).toBe("route-workspace");
    expect(
      resolveSidebarWorkspaceUuid({
        activeChatWorkspaceId: "chat-workspace",
        activeWorkspaceId: "active-workspace",
        preferredWorkspaceId: "preferred-workspace",
        routeWorkspaceUuid: null,
        workspaces,
      })
    ).toBe("active-workspace");
    expect(
      resolveSidebarWorkspaceUuid({
        activeChatWorkspaceId: "chat-workspace",
        activeWorkspaceId: null,
        preferredWorkspaceId: "preferred-workspace",
        routeWorkspaceUuid: null,
        workspaces,
      })
    ).toBe("preferred-workspace");
    expect(
      resolveSidebarWorkspaceUuid({
        activeChatWorkspaceId: "chat-workspace",
        activeWorkspaceId: null,
        preferredWorkspaceId: null,
        routeWorkspaceUuid: null,
        workspaces,
      })
    ).toBe("chat-workspace");
    expect(
      resolveSidebarWorkspaceUuid({
        activeChatWorkspaceId: null,
        activeWorkspaceId: null,
        preferredWorkspaceId: null,
        routeWorkspaceUuid: null,
        workspaces,
      })
    ).toBe("workspace-1");
    expect(
      resolveSidebarWorkspaceUuid({
        activeChatWorkspaceId: null,
        activeWorkspaceId: null,
        preferredWorkspaceId: null,
        routeWorkspaceUuid: null,
        workspaces: [],
      })
    ).toBeNull();
  });

  it("keeps preferred workspace syncing and seeding rules explicit", () => {
    expect(
      shouldSyncRouteWorkspacePreference({
        routeWorkspaceUuid: "workspace-2",
        storedPreferredWorkspaceId: "workspace-1",
      })
    ).toBe(true);
    expect(
      shouldSyncRouteWorkspacePreference({
        routeWorkspaceUuid: "workspace-2",
        storedPreferredWorkspaceId: "workspace-2",
      })
    ).toBe(false);
    expect(
      shouldSyncRouteWorkspacePreference({
        routeWorkspaceUuid: null,
        storedPreferredWorkspaceId: "workspace-2",
      })
    ).toBe(false);

    expect(
      shouldSeedPreferredWorkspaceId({
        derivedWorkspaceUuid: "workspace-1",
        routeWorkspaceUuid: null,
        storedPreferredWorkspaceId: null,
      })
    ).toBe(true);
    expect(
      shouldSeedPreferredWorkspaceId({
        derivedWorkspaceUuid: null,
        routeWorkspaceUuid: null,
        storedPreferredWorkspaceId: null,
      })
    ).toBe(false);
    expect(
      shouldSeedPreferredWorkspaceId({
        derivedWorkspaceUuid: "workspace-1",
        routeWorkspaceUuid: "workspace-2",
        storedPreferredWorkspaceId: null,
      })
    ).toBe(false);
    expect(
      shouldSeedPreferredWorkspaceId({
        derivedWorkspaceUuid: "workspace-1",
        routeWorkspaceUuid: null,
        storedPreferredWorkspaceId: "workspace-9",
      })
    ).toBe(false);
  });

  it("keeps sidebar view selection and mounted-surface bookkeeping explicit", () => {
    expect(
      resolveDashboardSidebarSurfaceView({
        desktopSidebarView: "files",
        isMobile: false,
        mobileSidebarView: "chat",
      })
    ).toBe("files");
    expect(
      resolveDashboardSidebarSurfaceView({
        desktopSidebarView: "files",
        isMobile: true,
        mobileSidebarView: "chat",
      })
    ).toBe("chat");

    expect(resolveDashboardSidebarActiveTabValue("workspace")).toBeNull();
    expect(resolveDashboardSidebarActiveTabValue("flashcards")).toBe(
      "flashcards"
    );

    expect(
      resolveInitialDashboardSidebarView({
        activeView: "files",
        isMobile: false,
      })
    ).toBe("workspace");
    expect(
      resolveInitialDashboardSidebarView({
        activeView: "files",
        isMobile: true,
      })
    ).toBe("files");
    expect(
      resolveInitialDashboardSidebarView({
        activeView: "chat",
        isMobile: false,
      })
    ).toBe("chat");

    expect(
      Array.from(
        resolveInitialMountedDashboardSidebarViews({
          activeView: "files",
          isMobile: false,
        })
      )
    ).toEqual([]);
    expect(
      Array.from(
        resolveInitialMountedDashboardSidebarViews({
          activeView: "files",
          isMobile: true,
        })
      )
    ).toEqual(["files"]);

    const initialMountedViews = new Set(["chat"] as const);
    expect(
      getNextMountedDashboardSidebarViews({
        mountedViews: initialMountedViews,
        sidebarView: "workspace",
      })
    ).toBe(initialMountedViews);
    expect(
      getNextMountedDashboardSidebarViews({
        mountedViews: initialMountedViews,
        sidebarView: "chat",
      })
    ).toBe(initialMountedViews);
    expect(
      Array.from(
        getNextMountedDashboardSidebarViews({
          mountedViews: initialMountedViews,
          sidebarView: "files",
        })
      )
    ).toEqual(["chat", "files"]);
  });

  it("sends chat session-close with sendBeacon when available and falls back to fetch otherwise", async () => {
    const sendBeacon = vi.fn();
    vi.stubGlobal("navigator", { sendBeacon });

    await sendDashboardSidebarChatSessionClose({
      chatId: "chat-1",
      sessionId: "session-1",
    });
    expect(sendBeacon).toHaveBeenCalledWith("/api/chat", expect.any(Blob));

    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("navigator", { sendBeacon: undefined });

    await sendDashboardSidebarChatSessionClose({
      chatId: "chat-2",
      sessionId: "session-2",
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/chat", {
      body: JSON.stringify({
        kind: "session-close",
        chatId: "chat-2",
        sessionId: "session-2",
      }),
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  });

  it("parses sidebar responses only when they are ok and recognizes typing targets", async () => {
    await expect(
      parseDashboardSidebarResponse<{ ok: boolean }>(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      )
    ).resolves.toEqual({ ok: true });
    await expect(
      parseDashboardSidebarResponse<{ ok: boolean }>(
        new Response(null, { status: 500 })
      )
    ).resolves.toBeNull();

    class ElementMock {
      isContentEditable = false;
      tagName: string;

      constructor(tagName: string) {
        this.tagName = tagName.toUpperCase();
      }
    }

    class InputMock extends ElementMock {
      type: string;

      constructor(type: string) {
        super("input");
        this.type = type;
      }
    }

    vi.stubGlobal("HTMLElement", ElementMock as never);
    vi.stubGlobal("HTMLInputElement", InputMock as never);

    const editable = new ElementMock("div");
    editable.isContentEditable = true;
    expect(isTypingTarget(editable as never)).toBe(true);
    expect(isTypingTarget(new ElementMock("textarea") as never)).toBe(true);
    expect(isTypingTarget(new ElementMock("select") as never)).toBe(true);
    expect(isTypingTarget(new InputMock("text") as never)).toBe(true);
    expect(isTypingTarget(new InputMock("checkbox") as never)).toBe(false);
    expect(isTypingTarget(new ElementMock("button") as never)).toBe(false);
  });
});
