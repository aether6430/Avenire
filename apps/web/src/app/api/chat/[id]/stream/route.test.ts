import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  afterMock,
  authGetSessionMock,
  clearActiveStreamIdMock,
  createResumableStreamContextMock,
  getActiveStreamIdMock,
  getChatBySlugForUserMock,
  getRedisClientMock,
  getRedisSubscriberMock,
  headersMock,
  resolveWorkspaceForUserMock,
  resumeExistingStreamMock,
} = vi.hoisted(() => ({
  afterMock: vi.fn(),
  authGetSessionMock: vi.fn(),
  clearActiveStreamIdMock: vi.fn(),
  createResumableStreamContextMock: vi.fn(),
  getActiveStreamIdMock: vi.fn(),
  getChatBySlugForUserMock: vi.fn(),
  getRedisClientMock: vi.fn(),
  getRedisSubscriberMock: vi.fn(),
  headersMock: vi.fn(),
  resolveWorkspaceForUserMock: vi.fn(),
  resumeExistingStreamMock: vi.fn(),
}));

vi.mock("@avenire/ai", () => ({
  UI_MESSAGE_STREAM_HEADERS: {
    "Content-Type": "text/plain; charset=utf-8",
    "x-ui-message-stream": "1",
  },
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

vi.mock("next/server", () => ({
  after: afterMock,
}));

vi.mock("resumable-stream", () => ({
  createResumableStreamContext: createResumableStreamContextMock,
}));

vi.mock("@/lib/chat-data", () => ({
  getChatBySlugForUser: getChatBySlugForUserMock,
}));

vi.mock("@/lib/file-data", () => ({
  resolveWorkspaceForUser: resolveWorkspaceForUserMock,
}));

vi.mock("../../chat-stream-store", () => ({
  clearActiveStreamId: clearActiveStreamIdMock,
  getActiveStreamId: getActiveStreamIdMock,
  getRedisClient: getRedisClientMock,
  getRedisSubscriber: getRedisSubscriberMock,
}));

import { GET } from "./route";

describe("/api/chat/[id]/stream route", () => {
  beforeEach(() => {
    afterMock.mockReset();
    authGetSessionMock.mockReset();
    clearActiveStreamIdMock.mockReset();
    createResumableStreamContextMock.mockReset();
    getActiveStreamIdMock.mockReset();
    getChatBySlugForUserMock.mockReset();
    getRedisClientMock.mockReset();
    getRedisSubscriberMock.mockReset();
    headersMock.mockReset();
    resolveWorkspaceForUserMock.mockReset();
    resumeExistingStreamMock.mockReset();

    headersMock.mockResolvedValue(new Headers());
    createResumableStreamContextMock.mockReturnValue({
      resumeExistingStream: resumeExistingStreamMock,
    });
    getRedisClientMock.mockResolvedValue("redis-publisher");
    getRedisSubscriberMock.mockResolvedValue("redis-subscriber");
  });

  it("returns unauthorized when there is no session user", async () => {
    authGetSessionMock.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost:3003/api/chat/chat-1/stream"),
      {
        params: Promise.resolve({ id: "chat-1" }),
      }
    );

    expect(response.status).toBe(401);
  });

  it("returns 500 when session lookup throws before stream resolution", async () => {
    authGetSessionMock.mockRejectedValueOnce(new Error("chat stream offline"));

    const response = await GET(
      new Request("http://localhost:3003/api/chat/chat-1/stream"),
      {
        params: Promise.resolve({ id: "chat-1" }),
      }
    );

    expect(response.status).toBe(500);
    expect(resolveWorkspaceForUserMock).not.toHaveBeenCalled();
  });

  it("returns not found when the workspace cannot be resolved and 204 when the chat stream cannot be resumed", async () => {
    authGetSessionMock.mockResolvedValue({
      session: { activeOrganizationId: "org-1" },
      user: { id: "user-1" },
    });
    resolveWorkspaceForUserMock.mockResolvedValue(null);
    getActiveStreamIdMock.mockResolvedValue("stream-1");

    let response = await GET(
      new Request("http://localhost:3003/api/chat/chat-1/stream"),
      { params: Promise.resolve({ id: "chat-1" }) }
    );
    expect(response.status).toBe(404);

    resolveWorkspaceForUserMock.mockResolvedValue({
      workspaceId: "workspace-1",
    });
    getActiveStreamIdMock.mockResolvedValue("stream-1");
    getChatBySlugForUserMock.mockResolvedValue(null);

    response = await GET(
      new Request("http://localhost:3003/api/chat/chat-1/stream"),
      { params: Promise.resolve({ id: "chat-1" }) }
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns 204 with no-store when there is no active stream id before any workspace lookup", async () => {
    authGetSessionMock.mockResolvedValue({
      session: { activeOrganizationId: "org-1" },
      user: { id: "user-1" },
    });
    getActiveStreamIdMock.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost:3003/api/chat/chat-1/stream"),
      { params: Promise.resolve({ id: "chat-1" }) }
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(resolveWorkspaceForUserMock).not.toHaveBeenCalled();
    expect(getChatBySlugForUserMock).not.toHaveBeenCalled();
  });

  it("clears stale active stream ids when the resumable stream is gone", async () => {
    authGetSessionMock.mockResolvedValue({
      session: { activeOrganizationId: "org-1" },
      user: { id: "user-1" },
    });
    resolveWorkspaceForUserMock.mockResolvedValue({
      workspaceId: "workspace-1",
    });
    getChatBySlugForUserMock.mockResolvedValue({ id: "db-chat-1" });
    getActiveStreamIdMock.mockResolvedValue("stream-1");
    resumeExistingStreamMock.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost:3003/api/chat/chat-1/stream"),
      { params: Promise.resolve({ id: "chat-1" }) }
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(clearActiveStreamIdMock).toHaveBeenCalledWith("chat-1", "stream-1");
  });

  it("returns the resumed stream with no-store headers when a stream exists", async () => {
    authGetSessionMock.mockResolvedValue({
      session: { activeOrganizationId: "org-1" },
      user: { id: "user-1" },
    });
    resolveWorkspaceForUserMock.mockResolvedValue({
      workspaceId: "workspace-1",
    });
    getChatBySlugForUserMock.mockResolvedValue({ id: "db-chat-1" });
    getActiveStreamIdMock.mockResolvedValue("stream-1");
    resumeExistingStreamMock.mockResolvedValue(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("hello"));
          controller.close();
        },
      })
    );

    const response = await GET(
      new Request("http://localhost:3003/api/chat/chat-1/stream"),
      { params: Promise.resolve({ id: "chat-1" }) }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toContain("text/plain");
    await expect(response.text()).resolves.toBe("hello");
    expect(createResumableStreamContextMock).toHaveBeenCalledWith({
      publisher: "redis-publisher",
      subscriber: "redis-subscriber",
      waitUntil: afterMock,
    });
  });

  it("falls back to 204 when resuming the stream throws", async () => {
    authGetSessionMock.mockResolvedValue({
      session: { activeOrganizationId: "org-1" },
      user: { id: "user-1" },
    });
    resolveWorkspaceForUserMock.mockResolvedValue({
      workspaceId: "workspace-1",
    });
    getChatBySlugForUserMock.mockResolvedValue({ id: "db-chat-1" });
    getActiveStreamIdMock.mockResolvedValue("stream-1");
    createResumableStreamContextMock.mockImplementation(() => {
      throw new Error("boom");
    });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(
      new Request("http://localhost:3003/api/chat/chat-1/stream"),
      { params: Promise.resolve({ id: "chat-1" }) }
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("no-store");
    errorSpy.mockRestore();
  });
});
