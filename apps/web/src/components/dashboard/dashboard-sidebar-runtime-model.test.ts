import { describe, expect, it } from "vitest";
import {
  deriveActiveChatSlugFromPath,
  deriveCurrentFlashcardSetId,
  deriveCurrentFolderId,
  deriveDashboardSidebarRouteView,
  deriveRouteWorkspaceUuid,
  getNextMountedDashboardSidebarViews,
  resolveDashboardSidebarActiveTabValue,
  resolveDashboardSidebarSurfaceView,
  resolveInitialDashboardSidebarView,
  resolveInitialMountedDashboardSidebarViews,
  resolveSidebarWorkspaceUuid,
  shouldSeedPreferredWorkspaceId,
  shouldSyncRouteWorkspacePreference,
} from "@/components/dashboard/dashboard-sidebar-runtime-model";

describe("dashboard sidebar runtime model", () => {
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
});
