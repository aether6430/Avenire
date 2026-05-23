import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authGetSessionMock,
  branchChatForUserMock,
  deleteChatForUserMock,
  getChatBySlugForUserMock,
  getWritableChatBySlugForUserMock,
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
  getWritableChatBySlugForUserMock: vi.fn(),
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
  getWritableChatBySlugForUser: getWritableChatBySlugForUserMock,
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
  getWritableChatBySlugForUserMock.mockResolvedValue({
    ...CHAT_RECORD,
    ownerUserId: "user-1",
    readOnly: !owner,
  });
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
    getWritableChatBySlugForUserMock.mockReset();
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

  it.each([
    {
      body: undefined,
      method: "GET" as const,
    },
    {
      body: { title: "New title" },
      method: "PATCH" as const,
    },
    {
      body: undefined,
      method: "POST" as const,
    },
    {
      body: undefined,
      method: "DELETE" as const,
    },
  ])("fails closed from $method when session lookup throws before chat route handling begins", async ({
    body,
    method,
  }) => {
    authGetSessionMock.mockRejectedValueOnce(new Error("chat auth offline"));

    const response =
      method === "GET"
        ? await GET(routeRequest("GET"), CHAT_ROUTE_PARAMS)
        : method === "PATCH"
          ? await PATCH(routeRequest("PATCH", body), CHAT_ROUTE_PARAMS)
          : method === "POST"
            ? await POST(routeRequest("POST"), CHAT_ROUTE_PARAMS)
            : await DELETE(routeRequest("DELETE"), CHAT_ROUTE_PARAMS);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "chat auth offline",
    });
    expect(getChatBySlugForUserMock).not.toHaveBeenCalled();
    expect(getMessagesByChatSlugForUserMock).not.toHaveBeenCalled();
    expect(updateChatForUserMock).not.toHaveBeenCalled();
    expect(branchChatForUserMock).not.toHaveBeenCalled();
    expect(deleteChatForUserMock).not.toHaveBeenCalled();
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

  it("returns a 500 json error from GET when chat loading throws", async () => {
    authGetSessionMock.mockResolvedValue(SESSION_USER);
    getChatBySlugForUserMock.mockRejectedValueOnce(
      new Error("chat detail offline")
    );

    const response = await GET(routeRequest("GET"), CHAT_ROUTE_PARAMS);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "chat detail offline",
    });
  });

  it.each([
    {
      expected: { error: "Read-only Method", status: 403 },
      name: "returns read-only Method from PATCH when the user is not the owner",
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
    expect(publishWorkspaceStreamEventMock).toHaveBeenNthCalledWith(1, {
      workspaceUuid: "workspace-1",
      type: "chat.updated",
      payload: {
        action: "updated",
        chat: {
          ...CHAT_RECORD,
          title: "New title",
        },
        chatSlug: "chat-1",
        workspaceUuid: "workspace-1",
      },
    });
    expect(publishWorkspaceStreamEventMock).toHaveBeenNthCalledWith(2, {
      workspaceUuid: "workspace-1",
      type: "chat.invalidate",
      payload: {
        action: "updated",
        chat: {
          ...CHAT_RECORD,
          title: "New title",
        },
        chatSlug: "chat-1",
        workspaceUuid: "workspace-1",
      },
    });
  });

  it("returns a 500 json error from PATCH when chat mutation throws before invalidation", async () => {
    mockAuthorizedChatAccess(true);
    updateChatForUserMock.mockRejectedValueOnce(
      new Error("chat patch offline")
    );

    const response = await PATCH(
      routeRequest("PATCH", { title: "New title" }),
      CHAT_ROUTE_PARAMS
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "chat patch offline",
    });
    expect(invalidateChatReadCachesMock).not.toHaveBeenCalled();
    expect(publishWorkspaceStreamEventMock).not.toHaveBeenCalled();
  });

  it("returns read-only method from POST when the user is not the owner", async () => {
    mockAuthorizedChatAccess(false);

    await expect(
      readRouteError(await POST(routeRequest("POST"), CHAT_ROUTE_PARAMS))
    ).resolves.toEqual({
      body: { error: "Read-only Method" },
      status: 403,
    });
    expect(isChatOwnerForUserMock).not.toHaveBeenCalled();
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
    expect(publishWorkspaceStreamEventMock).toHaveBeenNthCalledWith(1, {
      workspaceUuid: "workspace-1",
      type: "chat.created",
      payload: {
        action: "created",
        chat: {
          slug: "chat-2",
          workspaceId: "workspace-1",
        },
        chatSlug: "chat-2",
        workspaceUuid: "workspace-1",
      },
    });
    expect(publishWorkspaceStreamEventMock).toHaveBeenNthCalledWith(2, {
      workspaceUuid: "workspace-1",
      type: "chat.invalidate",
      payload: {
        action: "created",
        chat: {
          slug: "chat-2",
          workspaceId: "workspace-1",
        },
        chatSlug: "chat-2",
        workspaceUuid: "workspace-1",
      },
    });
  });

  it("returns a 500 json error from POST when chat branching throws before invalidation", async () => {
    mockAuthorizedChatAccess(true);
    branchChatForUserMock.mockRejectedValueOnce(
      new Error("chat branch offline")
    );

    const response = await POST(routeRequest("POST"), CHAT_ROUTE_PARAMS);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "chat branch offline",
    });
    expect(invalidateChatReadCachesMock).not.toHaveBeenCalled();
    expect(publishWorkspaceStreamEventMock).not.toHaveBeenCalled();
  });

  it.each([
    {
      expected: { error: "Read-only Method", status: 403 },
      name: "returns read-only Method from DELETE when the user is not the owner",
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
    expect(publishWorkspaceStreamEventMock).toHaveBeenNthCalledWith(1, {
      workspaceUuid: "workspace-1",
      type: "chat.deleted",
      payload: {
        action: "deleted",
        chat: CHAT_RECORD,
        chatSlug: "chat-1",
        workspaceUuid: "workspace-1",
      },
    });
    expect(publishWorkspaceStreamEventMock).toHaveBeenNthCalledWith(2, {
      workspaceUuid: "workspace-1",
      type: "chat.invalidate",
      payload: {
        action: "deleted",
        chat: CHAT_RECORD,
        chatSlug: "chat-1",
        workspaceUuid: "workspace-1",
      },
    });
  });

  it("returns a 500 json error from DELETE when chat deletion throws before invalidation", async () => {
    mockAuthorizedChatAccess(true);
    deleteChatForUserMock.mockRejectedValueOnce(
      new Error("chat delete offline")
    );

    const response = await DELETE(routeRequest("DELETE"), CHAT_ROUTE_PARAMS);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "chat delete offline",
    });
    expect(invalidateChatReadCachesMock).not.toHaveBeenCalled();
    expect(publishWorkspaceStreamEventMock).not.toHaveBeenCalled();
  });
});
