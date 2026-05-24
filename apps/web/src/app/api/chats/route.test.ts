import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authGetSessionMock,
  createChatForUserMock,
  handleChatDirectoryRoutePostMock,
  headersMock,
  invalidateChatReadCachesMock,
  publishWorkspaceStreamEventMock,
  resolveWorkspaceForUserMock,
} = vi.hoisted(() => ({
  authGetSessionMock: vi.fn(),
  createChatForUserMock: vi.fn(),
  handleChatDirectoryRoutePostMock: vi.fn(),
  headersMock: vi.fn(),
  invalidateChatReadCachesMock: vi.fn(),
  publishWorkspaceStreamEventMock: vi.fn(),
  resolveWorkspaceForUserMock: vi.fn(),
}));

vi.mock("@avenire/auth/server", () => ({
  auth: {
    api: {
      getSession: authGetSessionMock,
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@avenire/database", () => ({
  createChatForUser: createChatForUserMock,
}));

vi.mock("@/lib/domain-cache", () => ({
  invalidateChatReadCaches: invalidateChatReadCachesMock,
}));

vi.mock("@/lib/file-data", () => ({
  resolveWorkspaceForUser: resolveWorkspaceForUserMock,
}));

vi.mock("@/lib/workspace-event-stream", () => ({
  publishWorkspaceStreamEvent: publishWorkspaceStreamEventMock,
}));

import { POST } from "./route";

describe("/api/chats route", () => {
  beforeEach(() => {
    authGetSessionMock.mockReset();
    createChatForUserMock.mockReset();
    handleChatDirectoryRoutePostMock.mockReset();
    headersMock.mockReset();
    invalidateChatReadCachesMock.mockReset();
    publishWorkspaceStreamEventMock.mockReset();
    resolveWorkspaceForUserMock.mockReset();

    headersMock.mockResolvedValue(new Headers());
  });

  it("returns unauthorized when there is no signed-in session", async () => {
    authGetSessionMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3003/api/chats", {
        body: JSON.stringify({ title: "New chat" }),
        method: "POST",
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns workspace not found when the active workspace is missing", async () => {
    authGetSessionMock.mockResolvedValue({
      session: { activeOrganizationId: "org-1" },
      user: { id: "user-1" },
    });
    resolveWorkspaceForUserMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3003/api/chats", {
        body: JSON.stringify({ title: "New chat" }),
        method: "POST",
      })
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Workspace not found",
    });
  });

  it("creates a chat with a trimmed title, invalidates caches, and publishes a realtime invalidate event", async () => {
    authGetSessionMock.mockResolvedValue({
      session: { activeOrganizationId: "org-1" },
      user: { id: "user-1" },
    });
    resolveWorkspaceForUserMock.mockResolvedValue({
      workspaceId: "workspace-1",
    });
    createChatForUserMock.mockResolvedValue({
      id: "chat-1",
      slug: "chat-1",
    });

    const response = await POST(
      new Request("http://localhost:3003/api/chats", {
        body: JSON.stringify({ title: "  New chat  " }),
        method: "POST",
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      chat: {
        id: "chat-1",
        slug: "chat-1",
      },
    });
    expect(createChatForUserMock).toHaveBeenCalledWith(
      "user-1",
      "workspace-1",
      "New chat"
    );
    expect(invalidateChatReadCachesMock).toHaveBeenCalledWith("workspace-1");
    expect(publishWorkspaceStreamEventMock).toHaveBeenNthCalledWith(1, {
      workspaceUuid: "workspace-1",
      type: "chat.created",
      payload: {
        action: "created",
        chat: {
          id: "chat-1",
          slug: "chat-1",
        },
        chatSlug: "chat-1",
        workspaceUuid: "workspace-1",
      },
    });
    expect(publishWorkspaceStreamEventMock).toHaveBeenNthCalledWith(2, {
      workspaceUuid: "workspace-1",
      type: "chat.invalidate",
      payload: {
        action: "created",
        chat: {
          id: "chat-1",
          slug: "chat-1",
        },
        chatSlug: "chat-1",
        workspaceUuid: "workspace-1",
      },
    });
  });

  it("collapses whitespace-only titles to undefined before chat creation", async () => {
    authGetSessionMock.mockResolvedValue({
      session: { activeOrganizationId: "org-1" },
      user: { id: "user-1" },
    });
    resolveWorkspaceForUserMock.mockResolvedValue({
      workspaceId: "workspace-1",
    });
    createChatForUserMock.mockResolvedValue({
      id: "chat-1",
      slug: "chat-1",
    });

    const response = await POST(
      new Request("http://localhost:3003/api/chats", {
        body: JSON.stringify({ title: "   " }),
        method: "POST",
      })
    );

    expect(response.status).toBe(201);
    expect(createChatForUserMock).toHaveBeenCalledWith(
      "user-1",
      "workspace-1",
      undefined
    );
  });

  it("maps lower-layer creation failures to stable json", async () => {
    authGetSessionMock.mockResolvedValue({
      session: { activeOrganizationId: "org-1" },
      user: { id: "user-1" },
    });
    resolveWorkspaceForUserMock.mockResolvedValue({
      workspaceId: "workspace-1",
    });
    createChatForUserMock.mockRejectedValue(new Error("database offline"));

    const response = await POST(
      new Request("http://localhost:3003/api/chats", {
        body: JSON.stringify({ title: "New chat" }),
        method: "POST",
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "database offline",
    });
  });

  it("returns a 500 json error when chat-directory session resolution throws before workspace lookup", async () => {
    authGetSessionMock.mockRejectedValueOnce(new Error("chat session offline"));

    const response = await POST(
      new Request("http://localhost:3003/api/chats", {
        body: JSON.stringify({ title: "New chat" }),
        method: "POST",
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "chat session offline",
    });
    expect(resolveWorkspaceForUserMock).not.toHaveBeenCalled();
    expect(createChatForUserMock).not.toHaveBeenCalled();
  });

  it("fails closed when the route wrapper handler throws before returning a response", async () => {
    vi.resetModules();
    handleChatDirectoryRoutePostMock.mockRejectedValueOnce(
      new Error("chat directory wrapper offline")
    );

    vi.doMock("./chat-directory-route-post", () => ({
      handleChatDirectoryRoutePost: handleChatDirectoryRoutePostMock,
    }));

    try {
      const { POST } = await import("./route");
      const response = await POST(
        new Request("http://localhost:3003/api/chats", {
          body: JSON.stringify({ title: "New chat" }),
          method: "POST",
        })
      );

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "chat directory wrapper offline",
      });
    } finally {
      vi.doUnmock("./chat-directory-route-post");
      vi.resetModules();
    }
  });
});
