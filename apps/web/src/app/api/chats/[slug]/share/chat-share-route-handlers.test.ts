import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createResourceShareLinkMock,
  grantResourceToUserByEmailMock,
  listWorkspaceShareSuggestionsMock,
  resolveAppBaseUrlMock,
} = vi.hoisted(() => ({
  createResourceShareLinkMock: vi.fn(),
  grantResourceToUserByEmailMock: vi.fn(),
  listWorkspaceShareSuggestionsMock: vi.fn(),
  resolveAppBaseUrlMock: vi.fn(),
}));

vi.mock("@/lib/app-base-url", () => ({
  resolveAppBaseUrl: resolveAppBaseUrlMock,
}));

vi.mock("@/lib/file-data", () => ({
  createResourceShareLink: createResourceShareLinkMock,
  grantResourceToUserByEmail: grantResourceToUserByEmailMock,
  listWorkspaceShareSuggestions: listWorkspaceShareSuggestionsMock,
}));

import { handleChatShareGrantsPost } from "./grants/chat-share-grants-post";
import { handleChatShareLinkPost } from "./link/chat-share-link-post";
import { handleChatShareSuggestionsGet } from "./suggestions/chat-share-suggestions-get";

function createApiLoggerStub() {
  return {
    featureUsed: vi.fn(),
    meter: vi.fn(),
    requestFailed: vi.fn(),
    requestSucceeded: vi.fn(),
  };
}

function createContext(overrides: Record<string, unknown> = {}) {
  return {
    apiLogger: createApiLoggerStub(),
    chat: {
      slug: "chat-1",
    },
    slug: "chat-1",
    user: {
      email: "owner@example.com",
      id: "user-1",
    },
    workspaceUuid: "workspace-1",
    ...overrides,
  } as never;
}

describe("chat share route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAppBaseUrlMock.mockReturnValue("https://avenire.app");
    createResourceShareLinkMock.mockResolvedValue({
      token: "token-123",
    });
    grantResourceToUserByEmailMock.mockResolvedValue({
      email: "friend@example.com",
      permission: "viewer",
    });
    listWorkspaceShareSuggestionsMock.mockResolvedValue([
      {
        email: "friend@example.com",
        userId: "user-2",
      },
    ]);
  });

  it("creates public share links and logs the share creation", async () => {
    const context = createContext();
    const response = await handleChatShareLinkPost({
      ...context,
      request: new Request("https://avenire.app/api/chats/chat-1/share/link", {
        method: "POST",
      }),
    });

    expect(createResourceShareLinkMock).toHaveBeenCalledWith({
      allowPublic: true,
      createdBy: "user-1",
      expiresInDays: 7,
      resourceId: "chat-1",
      resourceType: "chat",
      workspaceId: "workspace-1",
    });
    await expect(response.json()).resolves.toEqual({
      link: {
        token: "token-123",
      },
      shareUrl: "https://avenire.app/share/token-123",
    });
    expect(context.apiLogger.meter).toHaveBeenCalledWith(
      "meter.share.created",
      expect.objectContaining({
        resourceType: "chat-link",
      })
    );
    expect(context.apiLogger.requestSucceeded).toHaveBeenCalledWith(200, {
      slug: "chat-1",
    });
  });

  it("fails closed for missing grant emails and returns created grants for valid requests", async () => {
    const missingEmailContext = createContext();
    const missingEmailResponse = await handleChatShareGrantsPost({
      ...missingEmailContext,
      request: {
        json: vi.fn().mockResolvedValue({ email: "   " }),
      } as never,
    });

    expect(missingEmailResponse.status).toBe(400);
    await expect(missingEmailResponse.json()).resolves.toEqual({
      error: "Missing email",
    });
    expect(grantResourceToUserByEmailMock).not.toHaveBeenCalled();

    const successContext = createContext();
    const successResponse = await handleChatShareGrantsPost({
      ...successContext,
      request: {
        json: vi.fn().mockResolvedValue({ email: "  friend@example.com  " }),
      } as never,
    });

    expect(grantResourceToUserByEmailMock).toHaveBeenCalledWith({
      createdBy: "user-1",
      email: "friend@example.com",
      permission: "viewer",
      resourceId: "chat-1",
      resourceType: "chat",
      workspaceId: "workspace-1",
    });
    expect(successResponse.status).toBe(201);
    await expect(successResponse.json()).resolves.toEqual({
      grant: {
        email: "friend@example.com",
        permission: "viewer",
      },
    });
    expect(successContext.apiLogger.requestSucceeded).toHaveBeenCalledWith(
      201,
      {
        slug: "chat-1",
      }
    );
  });

  it("returns not found when a grant target is missing and exposes workspace suggestions", async () => {
    grantResourceToUserByEmailMock.mockResolvedValueOnce(null);
    const missingGrantContext = createContext();
    const missingGrantResponse = await handleChatShareGrantsPost({
      ...missingGrantContext,
      request: {
        json: vi.fn().mockResolvedValue({ email: "friend@example.com" }),
      } as never,
    });

    expect(missingGrantResponse.status).toBe(404);
    await expect(missingGrantResponse.json()).resolves.toEqual({
      error: "User not found",
    });

    const suggestionsContext = createContext();
    const suggestionsResponse = await handleChatShareSuggestionsGet({
      ...suggestionsContext,
      request: new Request(
        "https://avenire.app/api/chats/chat-1/share/suggestions?q=fr"
      ),
    });

    expect(listWorkspaceShareSuggestionsMock).toHaveBeenCalledWith({
      limit: 8,
      query: "fr",
      userEmail: "owner@example.com",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    await expect(suggestionsResponse.json()).resolves.toEqual({
      suggestions: [
        {
          email: "friend@example.com",
          userId: "user-2",
        },
      ],
    });
    expect(suggestionsContext.apiLogger.requestSucceeded).toHaveBeenCalledWith(
      200,
      {
        queryLength: 2,
        slug: "chat-1",
        suggestionCount: 1,
      }
    );
  });
});
