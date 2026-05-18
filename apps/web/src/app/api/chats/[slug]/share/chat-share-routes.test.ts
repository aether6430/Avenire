import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  handleChatShareGrantsPostMock,
  handleChatShareLinkPostMock,
  handleChatShareSuggestionsGetMock,
  resolveChatShareRouteContextMock,
} = vi.hoisted(() => ({
  handleChatShareGrantsPostMock: vi.fn(),
  handleChatShareLinkPostMock: vi.fn(),
  handleChatShareSuggestionsGetMock: vi.fn(),
  resolveChatShareRouteContextMock: vi.fn(),
}));

vi.mock("./chat-share-route-context", () => ({
  resolveChatShareRouteContext: resolveChatShareRouteContextMock,
}));

vi.mock("./grants/chat-share-grants-post", () => ({
  handleChatShareGrantsPost: handleChatShareGrantsPostMock,
}));

vi.mock("./link/chat-share-link-post", () => ({
  handleChatShareLinkPost: handleChatShareLinkPostMock,
}));

vi.mock("./suggestions/chat-share-suggestions-get", () => ({
  handleChatShareSuggestionsGet: handleChatShareSuggestionsGetMock,
}));

import { POST as postGrants } from "./grants/route";
import { POST as postLink } from "./link/route";
import { GET as getSuggestions } from "./suggestions/route";

describe("chat share routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveChatShareRouteContextMock.mockResolvedValue({
      apiLogger: {},
      chat: { slug: "chat-1" },
      slug: "chat-1",
      user: { id: "user-1" },
      workspaceUuid: "workspace-1",
    });
    handleChatShareGrantsPostMock.mockResolvedValue(
      Response.json({ grant: true })
    );
    handleChatShareLinkPostMock.mockResolvedValue(
      Response.json({ link: true })
    );
    handleChatShareSuggestionsGetMock.mockResolvedValue(
      Response.json({ suggestions: [] })
    );
  });

  it("returns the early response from share route context failures", async () => {
    resolveChatShareRouteContextMock.mockResolvedValueOnce({
      response: Response.json({ error: "Method not found" }, { status: 404 }),
    });

    const response = await postGrants(new Request("https://avenire.space"), {
      params: Promise.resolve({ slug: "chat-1" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Method not found",
    });
    expect(handleChatShareGrantsPostMock).not.toHaveBeenCalled();
  });

  it("delegates grants, link, and suggestions routes through the resolved share context", async () => {
    const request = new Request("https://avenire.space");
    const context = {
      params: Promise.resolve({ slug: "chat-1" }),
    };

    const grantsResponse = await postGrants(request, context);
    const linkResponse = await postLink(request, context);
    const suggestionsResponse = await getSuggestions(request, context);

    expect(handleChatShareGrantsPostMock).toHaveBeenCalledWith({
      apiLogger: {},
      chat: { slug: "chat-1" },
      request,
      slug: "chat-1",
      user: { id: "user-1" },
      workspaceUuid: "workspace-1",
    });
    expect(handleChatShareLinkPostMock).toHaveBeenCalledWith({
      apiLogger: {},
      chat: { slug: "chat-1" },
      request,
      slug: "chat-1",
      user: { id: "user-1" },
      workspaceUuid: "workspace-1",
    });
    expect(handleChatShareSuggestionsGetMock).toHaveBeenCalledWith({
      apiLogger: {},
      chat: { slug: "chat-1" },
      request,
      slug: "chat-1",
      user: { id: "user-1" },
      workspaceUuid: "workspace-1",
    });

    await expect(grantsResponse.json()).resolves.toEqual({ grant: true });
    await expect(linkResponse.json()).resolves.toEqual({ link: true });
    await expect(suggestionsResponse.json()).resolves.toEqual({
      suggestions: [],
    });
  });
});
