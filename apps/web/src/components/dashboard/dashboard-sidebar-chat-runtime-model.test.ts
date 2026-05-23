import { describe, expect, it } from "vitest";
import {
  buildDashboardSidebarChatRows,
  filterDashboardSidebarChats,
  getDashboardSidebarChatDateGroup,
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
        activeChatSlugProp: "prop-chat",
      })
    ).toBe("prop-chat");

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

  it("groups unpinned chats by recency without disturbing pinned methods", () => {
    const now = new Date("2026-05-21T12:00:00.000Z");
    const rows = buildDashboardSidebarChatRows({
      now,
      pinnedChats: [
        buildChat({ pinned: true, slug: "pinned", title: "Pinned" }),
      ],
      otherChats: [
        buildChat({
          slug: "today",
          title: "Today",
          updatedAt: "2026-05-21T09:00:00.000Z",
        }),
        buildChat({
          slug: "yesterday",
          title: "Yesterday",
          updatedAt: "2026-05-20T09:00:00.000Z",
        }),
        buildChat({
          slug: "week",
          title: "Week",
          updatedAt: "2026-05-16T09:00:00.000Z",
        }),
        buildChat({
          slug: "month",
          title: "Month",
          updatedAt: "2026-05-02T09:00:00.000Z",
        }),
        buildChat({
          slug: "older",
          title: "Older",
          updatedAt: "2026-04-01T09:00:00.000Z",
        }),
      ],
    });

    expect(
      rows.filter((row) => row.type === "header").map((row) => row.title)
    ).toEqual([
      "Pinned Methods",
      "Today",
      "Yesterday",
      "Previous 7 days",
      "Previous 30 days",
      "Older",
    ]);
  });

  it("falls back to lastMessageAt when updatedAt is invalid", () => {
    expect(
      getDashboardSidebarChatDateGroup(
        {
          lastMessageAt: "2026-05-20T10:00:00.000Z",
          updatedAt: "not-a-date",
        },
        new Date("2026-05-21T12:00:00.000Z")
      )
    ).toBe("Yesterday");
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
