import { describe, expect, it, vi } from "vitest";
import {
  loadDashboardSidebarChats,
  resolveSidebarChatsForWorkspace,
  resolveSidebarChatsFromInitial,
  shouldPersistSidebarChatsToCache,
} from "@/components/dashboard/dashboard-sidebar-chat-collection-runtime";

function buildChat(overrides: Record<string, unknown>) {
  return {
    id: "chat-1",
    lastMessageAt: "2026-05-18T12:00:00.000Z",
    pinned: false,
    slug: "chat-1",
    title: "Momentum Review",
    ...overrides,
  } as never;
}

describe("dashboard sidebar chat collection runtime", () => {
  it("keeps previous chats when initial ids are unchanged and otherwise accepts the incoming set", () => {
    const previousChats = [
      buildChat({ id: "chat-1" }),
      buildChat({ id: "chat-2" }),
    ];
    expect(
      resolveSidebarChatsFromInitial({
        initialChats: [
          buildChat({ id: "chat-1" }),
          buildChat({ id: "chat-2" }),
        ],
        previousChats,
      })
    ).toBe(previousChats);

    expect(
      resolveSidebarChatsFromInitial({
        initialChats: [buildChat({ id: "chat-3" })],
        previousChats,
      })
    ).toEqual([buildChat({ id: "chat-3" })]);
  });

  it("hydrates workspace chats from cache first, then active-workspace initial chats, otherwise clears them", () => {
    expect(
      resolveSidebarChatsForWorkspace({
        activeWorkspaceId: "workspace-1",
        cachedChats: [buildChat({ id: "cached-chat" })],
        hydrated: true,
        initialChats: [buildChat({ id: "initial-chat" })],
        trackedWorkspaceUuid: null,
        workspaceUuid: "workspace-2",
      })
    ).toEqual({
      chats: [buildChat({ id: "cached-chat" })],
      trackedWorkspaceUuid: "workspace-2",
    });

    expect(
      resolveSidebarChatsForWorkspace({
        activeWorkspaceId: "workspace-1",
        cachedChats: null,
        hydrated: true,
        initialChats: [buildChat({ id: "initial-chat" })],
        trackedWorkspaceUuid: null,
        workspaceUuid: "workspace-1",
      })
    ).toEqual({
      chats: [buildChat({ id: "initial-chat" })],
      trackedWorkspaceUuid: "workspace-1",
    });

    expect(
      resolveSidebarChatsForWorkspace({
        activeWorkspaceId: "workspace-1",
        cachedChats: null,
        hydrated: true,
        initialChats: [buildChat({ id: "initial-chat" })],
        trackedWorkspaceUuid: null,
        workspaceUuid: "workspace-2",
      })
    ).toEqual({
      chats: [],
      trackedWorkspaceUuid: "workspace-2",
    });
  });

  it("loads chats, writes cache only for the tracked workspace, and fails closed on errors", async () => {
    const writeCachedChats = vi.fn();
    const success = await loadDashboardSidebarChats({
      fetchChats: async () =>
        new Response(
          JSON.stringify({
            chats: [buildChat({ id: "chat-2" })],
          }),
          { status: 200 }
        ),
      trackedWorkspaceUuid: "workspace-1",
      workspaceUuid: "workspace-1",
      writeCachedChats,
    });

    expect(success).toEqual({
      chats: [buildChat({ id: "chat-2" })],
      errorMessage: null,
      loadFailed: false,
    });
    expect(writeCachedChats).toHaveBeenCalledWith("workspace-1", [
      buildChat({ id: "chat-2" }),
    ]);

    const failed = await loadDashboardSidebarChats({
      fetchChats: async () =>
        new Response(JSON.stringify({ error: "chat history offline" }), {
          status: 500,
        }),
      trackedWorkspaceUuid: "workspace-1",
      workspaceUuid: "workspace-1",
      writeCachedChats,
    });
    expect(failed).toEqual({
      chats: [],
      errorMessage: "chat history offline",
      loadFailed: true,
    });

    expect(
      shouldPersistSidebarChatsToCache({
        trackedWorkspaceUuid: "workspace-1",
        workspaceUuid: "workspace-1",
      })
    ).toBe(true);
    expect(
      shouldPersistSidebarChatsToCache({
        trackedWorkspaceUuid: "workspace-1",
        workspaceUuid: "workspace-2",
      })
    ).toBe(false);
  });
});
