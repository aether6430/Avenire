import { describe, expect, it } from "vitest";
import {
  applyDashboardChatInvalidation,
  applyDashboardChatNameUpdate,
  applyDashboardChatStreamStatus,
  parseDashboardWorkspaceInvalidationPayload,
  resolveDashboardChatSessionScope,
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
  it("applies chat-name and stream-status updates deterministically", () => {
    const renamed = applyDashboardChatNameUpdate({
      detail: { icon: "sparkles", id: "chat-2", name: "Torque Review" },
      previousChats: [buildChat({ slug: "chat-2", title: "Old title" })],
    });

    expect(renamed[0]).toMatchObject({
      icon: "sparkles",
      title: "Torque Review",
    });

    const submitted = applyDashboardChatStreamStatus({
      detail: { chatId: "chat-2", status: "submitted" },
      previousPendingChatSlug: null,
    });
    expect(submitted).toMatchObject({
      pendingChatSlug: "chat-2",
      shouldReload: true,
    });

    const ready = applyDashboardChatStreamStatus({
      detail: { chatId: "chat-2", status: "ready" },
      previousPendingChatSlug: "chat-2",
    });
    expect(ready.pendingChatSlug).toBeNull();
    expect(ready.shouldReload).toBe(true);

    const errored = applyDashboardChatStreamStatus({
      detail: { chatId: "chat-2", status: "error" },
      previousPendingChatSlug: "chat-2",
    });
    expect(errored.pendingChatSlug).toBeNull();
    expect(errored.shouldReload).toBe(false);
  });

  it("derives invalidation reload and session-close timer conditions explicitly", () => {
    expect(
      parseDashboardWorkspaceInvalidationPayload(
        JSON.stringify({
          action: "updated",
          chatSlug: "chat-1",
          workspaceUuid: "workspace-1",
        })
      )
    ).toEqual({
      action: "updated",
      chatSlug: "chat-1",
      workspaceUuid: "workspace-1",
    });
    expect(parseDashboardWorkspaceInvalidationPayload("{broken")).toBeNull();

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

    expect(
      applyDashboardChatInvalidation({
        detail: {
          kind: "chat",
          payload: {
            action: "deleted",
            chatSlug: "chat-1",
          },
          workspaceUuid: "workspace-1",
        },
        previousChats: [
          buildChat({ slug: "chat-1" }),
          buildChat({ id: "chat-2", slug: "chat-2", title: "Second chat" }),
        ],
        workspaceUuid: "workspace-1",
      })
    ).toEqual([
      buildChat({ id: "chat-2", slug: "chat-2", title: "Second chat" }),
    ]);

    expect(
      applyDashboardChatInvalidation({
        detail: {
          kind: "chat",
          payload: {
            action: "created",
            chat: buildChat({
              id: "chat-3",
              slug: "chat-3",
              title: "Created chat",
            }),
          },
          workspaceUuid: "workspace-1",
        },
        previousChats: [buildChat({ slug: "chat-1" })],
        workspaceUuid: "workspace-1",
      })
    ).toEqual([
      buildChat({
        id: "chat-3",
        slug: "chat-3",
        title: "Created chat",
      }),
      buildChat({ slug: "chat-1" }),
    ]);

    expect(
      applyDashboardChatInvalidation({
        detail: {
          kind: "chat",
          payload: {
            action: "updated",
            chat: buildChat({
              slug: "chat-1",
              title: "Updated title",
            }),
          },
          workspaceUuid: "workspace-1",
        },
        previousChats: [buildChat({ slug: "chat-1" })],
        workspaceUuid: "workspace-1",
      })
    ).toEqual([buildChat({ slug: "chat-1", title: "Updated title" })]);

    expect(
      applyDashboardChatInvalidation({
        detail: {
          kind: "chat",
          payload: {
            action: "updated",
            chat: { slug: "broken" },
          },
          workspaceUuid: "workspace-1",
        },
        previousChats: [buildChat({ slug: "chat-1" })],
        workspaceUuid: "workspace-1",
      })
    ).toBeNull();

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
