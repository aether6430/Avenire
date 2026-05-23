import { describe, expect, it } from "vitest";
import { getSidebarChatListState } from "./dashboard-sidebar-chats-model";

describe("dashboard sidebar chats model", () => {
  it("keeps sidebar chat loading, failure, and empty states distinct", () => {
    expect(
      getSidebarChatListState({
        loadFailed: false,
        loading: true,
        otherCount: 0,
        pinnedCount: 0,
      })
    ).toEqual({
      description: "Pinned and recent methods will appear here shortly.",
      title: "Loading methods...",
    });

    expect(
      getSidebarChatListState({
        errorMessage: "chat history offline",
        loadFailed: true,
        loading: false,
        otherCount: 0,
        pinnedCount: 0,
      })
    ).toEqual({
      description: "chat history offline",
      title: "Unable to load methods.",
    });

    expect(
      getSidebarChatListState({
        loadFailed: false,
        loading: false,
        otherCount: 0,
        pinnedCount: 0,
      })
    ).toEqual({
      description: "Start a method to see it here.",
      title: "No methods yet",
    });

    expect(
      getSidebarChatListState({
        loadFailed: false,
        loading: false,
        otherCount: 1,
        pinnedCount: 0,
      })
    ).toBeNull();
  });
});
