import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createApiLoggerMock,
  getChatBySlugForUserMock,
  getWritableChatBySlugForUserMock,
  getSessionUserMock,
  isChatOwnerForUserMock,
  loggerStub,
} = vi.hoisted(() => ({
  createApiLoggerMock: vi.fn(),
  getChatBySlugForUserMock: vi.fn(),
  getWritableChatBySlugForUserMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  isChatOwnerForUserMock: vi.fn(),
  loggerStub: {
    requestFailed: vi.fn(),
    requestStarted: vi.fn(),
  },
}));

vi.mock("@avenire/database", () => ({
  getChatBySlugForUser: getChatBySlugForUserMock,
  getWritableChatBySlugForUser: getWritableChatBySlugForUserMock,
  isChatOwnerForUser: isChatOwnerForUserMock,
}));

vi.mock("@/lib/observability", () => ({
  createApiLogger: createApiLoggerMock,
}));

vi.mock("@/lib/workspace", () => ({
  getSessionUser: getSessionUserMock,
}));

import { resolveChatShareRouteContext } from "./chat-share-route-context";

function createInput(
  overrides: Partial<Parameters<typeof resolveChatShareRouteContext>[0]> = {}
) {
  return {
    missingChat: {
      error: "Chat not found",
      status: 404,
    },
    missingWorkspace: {
      error: "Workspace not found",
      status: 404,
    },
    params: Promise.resolve({
      slug: "chat-1",
    }),
    request: new Request("https://avenire.app/api/chats/chat-1/share"),
    route: "/api/chats/[slug]/share",
    ...overrides,
  };
}

describe("chat share route context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createApiLoggerMock.mockReturnValue(loggerStub);
    getSessionUserMock.mockResolvedValue({
      email: "owner@example.com",
      id: "user-1",
    });
    getChatBySlugForUserMock.mockResolvedValue({
      ownerUserId: "user-1",
      slug: "chat-1",
      workspaceId: "workspace-1",
    });
    getWritableChatBySlugForUserMock.mockResolvedValue({
      ownerUserId: "user-1",
      readOnly: false,
      slug: "chat-1",
      workspaceId: "workspace-1",
    });
    isChatOwnerForUserMock.mockResolvedValue(true);
  });

  it("rejects unauthorized requests before chat lookup", async () => {
    getSessionUserMock.mockResolvedValueOnce(null);

    const result = await resolveChatShareRouteContext(createInput());

    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(401);
      await expect(result.response.json()).resolves.toEqual({
        error: "Unauthorized",
      });
    }
    expect(loggerStub.requestFailed).toHaveBeenCalledWith(401, "Unauthorized");
    expect(getChatBySlugForUserMock).not.toHaveBeenCalled();
  });

  it("returns the configured missing-chat policy when the chat is unavailable or not owned", async () => {
    getChatBySlugForUserMock.mockResolvedValueOnce(null);

    const missingChat = await resolveChatShareRouteContext(createInput());
    expect("response" in missingChat).toBe(true);
    if ("response" in missingChat) {
      expect(missingChat.response.status).toBe(404);
      await expect(missingChat.response.json()).resolves.toEqual({
        error: "Chat not found",
      });
    }

    getChatBySlugForUserMock.mockResolvedValueOnce({
      ownerUserId: "another-user",
      slug: "chat-1",
      workspaceId: "workspace-1",
    });

    const wrongOwner = await resolveChatShareRouteContext(
      createInput({
        requireOwnedChatRecord: true,
      })
    );
    expect("response" in wrongOwner).toBe(true);
    if ("response" in wrongOwner) {
      expect(wrongOwner.response.status).toBe(404);
      await expect(wrongOwner.response.json()).resolves.toEqual({
        error: "Chat not found",
      });
    }
  });

  it("rejects read-only viewers and chats without a workspace", async () => {
    getWritableChatBySlugForUserMock.mockResolvedValueOnce({
      ownerUserId: "user-1",
      readOnly: true,
      slug: "chat-1",
      workspaceId: "workspace-1",
    });

    const readOnly = await resolveChatShareRouteContext(createInput());
    expect("response" in readOnly).toBe(true);
    if ("response" in readOnly) {
      expect(readOnly.response.status).toBe(403);
      await expect(readOnly.response.json()).resolves.toEqual({
        error: "Read-only Method",
      });
    }
    expect(isChatOwnerForUserMock).not.toHaveBeenCalled();

    getChatBySlugForUserMock.mockResolvedValueOnce({
      ownerUserId: "user-1",
      slug: "chat-1",
      workspaceId: null,
    });

    const missingWorkspace = await resolveChatShareRouteContext(createInput());
    expect("response" in missingWorkspace).toBe(true);
    if ("response" in missingWorkspace) {
      expect(missingWorkspace.response.status).toBe(404);
      await expect(missingWorkspace.response.json()).resolves.toEqual({
        error: "Workspace not found",
      });
    }
  });

  it("returns the hydrated share context for owned chats", async () => {
    const result = await resolveChatShareRouteContext(createInput());

    expect("response" in result).toBe(false);
    if ("response" in result) {
      throw new Error("Expected a successful context.");
    }

    expect(result).toMatchObject({
      chat: expect.objectContaining({
        slug: "chat-1",
      }),
      slug: "chat-1",
      user: expect.objectContaining({
        id: "user-1",
      }),
      workspaceUuid: "workspace-1",
    });
    expect(loggerStub.requestStarted).toHaveBeenCalledTimes(1);
  });

  it("returns a 500 json error when session lookup throws before chat resolution", async () => {
    getSessionUserMock.mockRejectedValueOnce(new Error("chat share offline"));

    const result = await resolveChatShareRouteContext(createInput());

    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(500);
      await expect(result.response.json()).resolves.toEqual({
        error: "chat share offline",
      });
    }
    expect(getChatBySlugForUserMock).not.toHaveBeenCalled();
  });
});
