import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createChatShareLink,
  grantChatShareAccess,
  loadChatShareSuggestions,
} from "@/components/dashboard/chat-workspace-share-data";

describe("chat workspace client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads share suggestions and posts grants / signed links through the chat share endpoints", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            suggestions: [{ email: "ada@example.com", label: "Ada" }],
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ shareUrl: "https://example.com/share/chat-123" }),
          { status: 200 }
        )
      );

    await expect(
      loadChatShareSuggestions({
        chatSlug: "chat-123",
        email: "ada@example.com",
        signal: new AbortController().signal,
      })
    ).resolves.toEqual([{ email: "ada@example.com", label: "Ada" }]);

    await expect(
      grantChatShareAccess({
        chatSlug: "chat-123",
        email: "ada@example.com",
      })
    ).resolves.toBeUndefined();

    await expect(createChatShareLink("chat-123")).resolves.toBe(
      "https://example.com/share/chat-123"
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining(
        "/api/chats/chat-123/share/suggestions?q=ada%40example.com"
      ),
      expect.objectContaining({
        cache: "no-store",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/chats/chat-123/share/grants",
      expect.objectContaining({
        body: JSON.stringify({ email: "ada@example.com" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/chats/chat-123/share/link",
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("returns product-facing Method share errors when grant or link creation fails", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));

    await expect(
      grantChatShareAccess({
        chatSlug: "chat-123",
        email: "ada@example.com",
      })
    ).rejects.toThrow("Could not grant method access.");

    await expect(createChatShareLink("chat-123")).rejects.toThrow(
      "Unable to generate method link."
    );
  });
});
