import { describe, expect, it } from "vitest";
import {
  filterDashboardSidebarChats,
  resolveDashboardSidebarActiveChatSlug,
  resolveDashboardSidebarPrimaryChatRoute,
  toggleDashboardSidebarChatSearchState,
} from "@/components/dashboard/dashboard-sidebar-chat-runtime-model";

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

describe("dashboard sidebar chat runtime model", () => {
  it("resolves the active chat slug and primary chat route explicitly", () => {
    expect(
      resolveDashboardSidebarActiveChatSlug({
        activeChatSlugFromPath: "",
        activeChatSlugOverride: "override-chat",
        activeChatSlugProp: "prop-chat",
      })
    ).toBe("override-chat");

    expect(
      resolveDashboardSidebarPrimaryChatRoute({
        activeChatSlug: "",
        chats: [buildChat({ slug: "chat-7" })],
      })
    ).toBe("/workspace/chats/chat-7");
    expect(
      resolveDashboardSidebarPrimaryChatRoute({
        activeChatSlug: "",
        chats: [],
      })
    ).toBe("/workspace/chats/new");
  });

  it("sorts, splits, and filters pinned versus other chats", () => {
    const result = filterDashboardSidebarChats({
      chats: [
        buildChat({
          lastMessageAt: "2026-05-18T12:00:00.000Z",
          pinned: false,
          slug: "chat-b",
          title: "Beta",
        }),
        buildChat({
          lastMessageAt: "2026-05-18T13:00:00.000Z",
          pinned: true,
          slug: "chat-a",
          title: "Alpha",
        }),
        buildChat({
          lastMessageAt: "2026-05-18T11:00:00.000Z",
          pinned: true,
          slug: "chat-c",
          title: "Gamma",
        }),
      ],
      query: "alp",
    });

    expect(result.sortedChats.map((chat) => chat.slug)).toEqual([
      "chat-a",
      "chat-b",
      "chat-c",
    ]);
    expect(result.pinnedChats.map((chat) => chat.slug)).toEqual([
      "chat-a",
      "chat-c",
    ]);
    expect(result.otherChats.map((chat) => chat.slug)).toEqual(["chat-b"]);
    expect(result.filteredPinnedChats.map((chat) => chat.slug)).toEqual([
      "chat-a",
    ]);
    expect(result.filteredOtherChats).toEqual([]);
  });

  it("toggles sidebar chat search state and clears the query only when closing", () => {
    expect(toggleDashboardSidebarChatSearchState({ isOpen: false })).toEqual({
      isOpen: true,
      query: null,
    });
    expect(toggleDashboardSidebarChatSearchState({ isOpen: true })).toEqual({
      isOpen: false,
      query: "",
    });
  });
});
