import { describe, expect, it } from "vitest";
import {
  applyDashboardChatNameUpdate,
  applyDashboardChatStreamStatus,
  resolveDashboardChatSessionScope,
  resolveDashboardPendingCreatedChat,
  shouldReloadDashboardChatsForInvalidation,
  shouldStartDashboardChatSessionCloseTimer,
} from "@/components/dashboard/dashboard-sidebar-chat-events-runtime";

function buildChat(overrides: Record<string, unknown>) {
  return {
    branching: null,
    createdAt: "2026-05-18T12:00:00.000Z",
    icon: null,
    id: "chat-1",
    lastMessageAt: "2026-05-18T12:00:00.000Z",
    pinned: false,
    slug: "chat-1",
    title: "Momentum Review",
    updatedAt: "2026-05-18T12:00:00.000Z",
    workspaceId: "workspace-1",
    ...overrides,
  } as never;
}

describe("dashboard sidebar chat events runtime", () => {
  it("creates pending chats only when a new-chat flow is active", () => {
    const created = resolveDashboardPendingCreatedChat({
      activeChatSlug: "new",
      detail: { fromId: "new", id: "chat-2", title: "Torque Review" },
      pathname: "/workspace/chats/new",
      workspaceUuid: "workspace-1",
    });

    expect(created).toMatchObject({
      activeChatSlugOverride: "chat-2",
      navigateTo: "/workspace/chats/chat-2",
      pendingCreatedChat: expect.objectContaining({
        slug: "chat-2",
        title: "Torque Review",
        workspaceId: "workspace-1",
      }),
    });

    expect(
      resolveDashboardPendingCreatedChat({
        activeChatSlug: "chat-1",
        detail: { fromId: "chat-1", id: "chat-2", title: "Torque Review" },
        pathname: "/workspace/chats/chat-1",
        workspaceUuid: "workspace-1",
      })
    ).toBeNull();
  });

  it("applies chat-name and stream-status updates deterministically", () => {
    const pendingCreatedChat = buildChat({
      slug: "chat-2",
      title: "Draft title",
    });
    const renamed = applyDashboardChatNameUpdate({
      detail: { icon: "sparkles", id: "chat-2", name: "Torque Review" },
      pendingCreatedChat,
      previousChats: [buildChat({ slug: "chat-2", title: "Old title" })],
    });

    expect(renamed.chats[0]).toMatchObject({
      icon: "sparkles",
      title: "Torque Review",
    });
    expect(renamed.pendingCreatedChat).toMatchObject({
      icon: "sparkles",
      title: "Torque Review",
    });

    const submitted = applyDashboardChatStreamStatus({
      detail: { chatId: "chat-2", status: "submitted" },
      pendingCreatedChat,
      previousChats: [],
      previousPendingChatSlug: null,
    });
    expect(submitted).toMatchObject({
      pendingChatSlug: "chat-2",
    });

    const ready = applyDashboardChatStreamStatus({
      detail: { chatId: "chat-2", status: "ready" },
      pendingCreatedChat,
      previousChats: [],
      previousPendingChatSlug: "chat-2",
    });
    expect(ready.chats).toEqual([pendingCreatedChat]);
    expect(ready.pendingChatSlug).toBeNull();
    expect(ready.pendingCreatedChat).toBeNull();
  });

  it("derives invalidation reload and session-close timer conditions explicitly", () => {
    expect(
      shouldReloadDashboardChatsForInvalidation({
        detail: { kind: "chat", workspaceUuid: "workspace-1" },
        workspaceUuid: "workspace-1",
      })
    ).toBe(true);
    expect(
      shouldReloadDashboardChatsForInvalidation({
        detail: { kind: "files", workspaceUuid: "workspace-1" },
        workspaceUuid: "workspace-1",
      })
    ).toBe(false);

    const scope = resolveDashboardChatSessionScope({
      activeChatSlug: "chat-1",
      createSessionId: () => "session-1",
      currentScope: null,
      routeView: "files",
    });
    expect(scope).toEqual({
      chatId: "chat-1",
      sent: false,
      sessionId: "session-1",
    });

    expect(
      shouldStartDashboardChatSessionCloseTimer({
        routeView: "files",
        scope,
        timerActive: false,
      })
    ).toBe(true);
    expect(
      shouldStartDashboardChatSessionCloseTimer({
        routeView: "chat",
        scope,
        timerActive: false,
      })
    ).toBe(false);
  });
});
