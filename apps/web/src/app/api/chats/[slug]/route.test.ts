import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authGetSessionMock,
  branchChatForUserMock,
  deleteChatForUserMock,
  getChatBySlugForUserMock,
  getMessagesByChatSlugForUserMock,
  headersMock,
  invalidateChatReadCachesMock,
  isChatOwnerForUserMock,
  publishWorkspaceStreamEventMock,
  updateChatForUserMock,
} = vi.hoisted(() => ({
  authGetSessionMock: vi.fn(),
  branchChatForUserMock: vi.fn(),
  deleteChatForUserMock: vi.fn(),
  getChatBySlugForUserMock: vi.fn(),
  getMessagesByChatSlugForUserMock: vi.fn(),
  headersMock: vi.fn(),
  invalidateChatReadCachesMock: vi.fn(),
  isChatOwnerForUserMock: vi.fn(),
  publishWorkspaceStreamEventMock: vi.fn(),
  updateChatForUserMock: vi.fn(),
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

vi.mock("@/lib/chat-data", () => ({
  branchChatForUser: branchChatForUserMock,
  deleteChatForUser: deleteChatForUserMock,
  getChatBySlugForUser: getChatBySlugForUserMock,
  getMessagesByChatSlugForUser: getMessagesByChatSlugForUserMock,
  isChatOwnerForUser: isChatOwnerForUserMock,
  updateChatForUser: updateChatForUserMock,
}));

vi.mock("@/lib/domain-cache", () => ({
  invalidateChatReadCaches: invalidateChatReadCachesMock,
}));

vi.mock("@/lib/workspace-event-stream", () => ({
  publishWorkspaceStreamEvent: publishWorkspaceStreamEventMock,
}));

import { DELETE, GET, PATCH, POST } from "./route";

const CHAT_ROUTE_URL = "http://localhost:3003/api/chats/chat-1";
const CHAT_ROUTE_PARAMS = { params: Promise.resolve({ slug: "chat-1" }) };
const SESSION_USER = { user: { id: "user-1" } };
const CHAT_RECORD = {
  slug: "chat-1",
  workspaceId: "workspace-1",
};

function assertResponseDefined(
  response: Response | undefined
): asserts response is Response {
  if (!response) {
    throw new Error("Expected route handler to return a response");
  }
}

function routeRequest(
  method: "DELETE" | "GET" | "PATCH" | "POST",
  body?: unknown
) {
  return new Request(CHAT_ROUTE_URL, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function mockAuthorizedChatAccess(owner: boolean) {
  authGetSessionMock.mockResolvedValue(SESSION_USER);
  getChatBySlugForUserMock.mockResolvedValue(CHAT_RECORD);
  isChatOwnerForUserMock.mockResolvedValue(owner);
}

async function readRouteError(response: Response | undefined) {
  assertResponseDefined(response);
  return {
    body: await response.json(),
    status: response.status,
  };
}

describe("/api/chats/[slug] route", () => {
  beforeEach(() => {
    authGetSessionMock.mockReset();
    branchChatForUserMock.mockReset();
    deleteChatForUserMock.mockReset();
    getChatBySlugForUserMock.mockReset();
    getMessagesByChatSlugForUserMock.mockReset();
    headersMock.mockReset();
    invalidateChatReadCachesMock.mockReset();
    isChatOwnerForUserMock.mockReset();
    publishWorkspaceStreamEventMock.mockReset();
    updateChatForUserMock.mockReset();

    headersMock.mockResolvedValue(new Headers());
    publishWorkspaceStreamEventMock.mockResolvedValue(undefined);
  });

  it("returns unauthorized from GET when there is no signed-in session", async () => {
    authGetSessionMock.mockResolvedValue(null);

    const response = await GET(routeRequest("GET"), CHAT_ROUTE_PARAMS);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns chat not found from GET when the slug is missing for the user", async () => {
    authGetSessionMock.mockResolvedValue(SESSION_USER);
    getChatBySlugForUserMock.mockResolvedValue(null);

    const response = await GET(routeRequest("GET"), CHAT_ROUTE_PARAMS);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Method not found",
    });
  });

  it("returns chat and messages from GET", async () => {
    authGetSessionMock.mockResolvedValue(SESSION_USER);
    getChatBySlugForUserMock.mockResolvedValue(CHAT_RECORD);
    getMessagesByChatSlugForUserMock.mockResolvedValue([{ id: "message-1" }]);

    const response = await GET(routeRequest("GET"), CHAT_ROUTE_PARAMS);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      chat: CHAT_RECORD,
      messages: [{ id: "message-1" }],
    });
  });

  it.each([
    {
      expected: { error: "Read-only method", status: 403 },
      name: "returns read-only method from PATCH when the user is not the owner",
      prepare: () => mockAuthorizedChatAccess(false),
    },
    {
      expected: { error: "Method not found", status: 404 },
      name: "returns method not found from PATCH when update returns null",
      prepare: () => {
        mockAuthorizedChatAccess(true);
        updateChatForUserMock.mockResolvedValue(null);
      },
    },
  ])("$name", async ({ expected, prepare }) => {
    prepare();

    await expect(
      readRouteError(
        await PATCH(
          routeRequest("PATCH", { title: "New title" }),
          CHAT_ROUTE_PARAMS
        )
      )
    ).resolves.toEqual({
      body: { error: expected.error },
      status: expected.status,
    });
  });

  it("updates a chat, invalidates caches, and publishes realtime invalidation from PATCH", async () => {
    mockAuthorizedChatAccess(true);
    updateChatForUserMock.mockResolvedValue({
      ...CHAT_RECORD,
      title: "New title",
    });

    const response = await PATCH(
      routeRequest("PATCH", {
        title: "New title",
        pinned: true,
        icon: null,
      }),
      CHAT_ROUTE_PARAMS
    );

    assertResponseDefined(response);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      chat: {
        ...CHAT_RECORD,
        title: "New title",
      },
    });
    expect(updateChatForUserMock).toHaveBeenCalledWith(
      "user-1",
      "chat-1",
      {
        title: "New title",
        pinned: true,
        icon: null,
      },
      "workspace-1"
    );
    expect(invalidateChatReadCachesMock).toHaveBeenCalledWith("workspace-1");
    expect(publishWorkspaceStreamEventMock).toHaveBeenCalledWith({
      workspaceUuid: "workspace-1",
      type: "chat.invalidate",
      payload: {
        action: "updated",
        chatSlug: "chat-1",
        workspaceUuid: "workspace-1",
      },
    });
  });

  it("returns read-only method from POST when the user is not the owner", async () => {
    mockAuthorizedChatAccess(false);

    await expect(
      readRouteError(await POST(routeRequest("POST"), CHAT_ROUTE_PARAMS))
    ).resolves.toEqual({
      body: { error: "Read-only method" },
      status: 403,
    });
  });

  it("branches a chat and publishes invalidation from POST", async () => {
    mockAuthorizedChatAccess(true);
    branchChatForUserMock.mockResolvedValue({
      slug: "chat-2",
      workspaceId: "workspace-1",
    });

    const response = await POST(routeRequest("POST"), CHAT_ROUTE_PARAMS);

    assertResponseDefined(response);
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      chat: {
        slug: "chat-2",
        workspaceId: "workspace-1",
      },
    });
    expect(invalidateChatReadCachesMock).toHaveBeenCalledWith("workspace-1");
    expect(publishWorkspaceStreamEventMock).toHaveBeenCalledWith({
      workspaceUuid: "workspace-1",
      type: "chat.invalidate",
      payload: {
        action: "created",
        chatSlug: "chat-2",
        workspaceUuid: "workspace-1",
      },
    });
  });

  it.each([
    {
      expected: { error: "Read-only method", status: 403 },
      name: "returns read-only method from DELETE when the user is not the owner",
      prepare: () => mockAuthorizedChatAccess(false),
    },
    {
      expected: { error: "Method not found", status: 404 },
      name: "returns method not found from DELETE when delete returns null",
      prepare: () => {
        mockAuthorizedChatAccess(true);
        deleteChatForUserMock.mockResolvedValue(null);
      },
    },
  ])("$name", async ({ expected, prepare }) => {
    prepare();

    await expect(
      readRouteError(await DELETE(routeRequest("DELETE"), CHAT_ROUTE_PARAMS))
    ).resolves.toEqual({
      body: { error: expected.error },
      status: expected.status,
    });
  });

  it("deletes a chat and publishes invalidation from DELETE", async () => {
    mockAuthorizedChatAccess(true);
    deleteChatForUserMock.mockResolvedValue(CHAT_RECORD);

    const response = await DELETE(routeRequest("DELETE"), CHAT_ROUTE_PARAMS);

    assertResponseDefined(response);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(invalidateChatReadCachesMock).toHaveBeenCalledWith("workspace-1");
    expect(publishWorkspaceStreamEventMock).toHaveBeenCalledWith({
      workspaceUuid: "workspace-1",
      type: "chat.invalidate",
      payload: {
        action: "deleted",
        chatSlug: "chat-1",
        workspaceUuid: "workspace-1",
      },
    });
  });
});
