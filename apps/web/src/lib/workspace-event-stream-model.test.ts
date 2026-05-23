import { describe, expect, it, vi } from "vitest";
import {
  getStreamKey,
  toPositiveInt,
  toWorkspaceEvent,
} from "@/lib/workspace-event-stream-model";

describe("workspace event stream model", () => {
  it("builds stream keys and positive integer config values", () => {
    expect(getStreamKey("workspace-1")).toBe("workspace:events:workspace-1");
    expect(toPositiveInt("25", 10)).toBe(25);
    expect(toPositiveInt("0", 10)).toBe(10);
    expect(toPositiveInt(undefined, 10)).toBe(10);
  });

  it("parses valid redis stream entries into workspace events", () => {
    const event = toWorkspaceEvent("workspace-1", [
      "1716650000-0",
      [
        "type",
        "file.updated",
        "payload",
        '{"fileId":"file-1"}',
        "ts",
        "1716650000000",
        "requestId",
        "req-1",
      ],
    ]);

    expect(event).toEqual({
      payload: { fileId: "file-1" },
      requestId: "req-1",
      streamId: "1716650000-0",
      ts: 1_716_650_000_000,
      type: "file.updated",
      workspaceUuid: "workspace-1",
    });
  });

  it("fails closed on malformed entries and preserves raw payload text when json is invalid", () => {
    expect(toWorkspaceEvent("workspace-1", null)).toBeNull();

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(123);
    const event = toWorkspaceEvent("workspace-1", [
      "1716650000-0",
      ["payload", "{broken", "requestId", ""],
    ]);

    expect(event).toEqual({
      payload: { raw: "{broken" },
      requestId: null,
      streamId: "1716650000-0",
      ts: 123,
      type: "workspace.event",
      workspaceUuid: "workspace-1",
    });
    nowSpy.mockRestore();
  });

  it("keeps realtime route support aligned with specific chat/file/folder stream event types", async () => {
    const { isSupportedRealtimeEventType, toRealtimeEventChunk } =
      await vi.importActual<
        typeof import("@/app/api/realtime/events/realtime-events-route-model")
      >("@/app/api/realtime/events/realtime-events-route-model");

    expect(isSupportedRealtimeEventType("file.deleted")).toBe(true);
    expect(isSupportedRealtimeEventType("folder.updated")).toBe(true);
    expect(isSupportedRealtimeEventType("chat.created")).toBe(true);
    expect(isSupportedRealtimeEventType("tree.changed")).toBe(true);
    expect(isSupportedRealtimeEventType("workspace.event")).toBe(false);

    expect(
      toRealtimeEventChunk({
        event: {
          payload: { fileId: "file-1" },
          requestId: "req-1",
          streamId: "1716650000-0",
          ts: 123,
          type: "file.deleted",
          workspaceUuid: "workspace-1",
        },
        workspaceUuid: "workspace-1",
      })
    ).toContain("event: file.deleted");
  });

  it("fails closed when realtime route session lookup throws before stream handling begins", async () => {
    vi.resetModules();

    const getSessionUserMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("realtime auth offline"));
    const handleRealtimeEventsRouteGetMock = vi.fn();

    vi.doMock("@/lib/workspace", () => ({
      getSessionUser: getSessionUserMock,
    }));
    vi.doMock("@/app/api/realtime/events/realtime-events-route-get", () => ({
      handleRealtimeEventsRouteGet: handleRealtimeEventsRouteGetMock,
    }));

    try {
      const { GET } = await import("@/app/api/realtime/events/route");

      const response = await GET(new Request("http://localhost:3003"));

      expect(response.status).toBe(500);
      await expect(response.text()).resolves.toBe("realtime auth offline");
      expect(handleRealtimeEventsRouteGetMock).not.toHaveBeenCalled();
    } finally {
      vi.doUnmock("@/lib/workspace");
      vi.doUnmock("@/app/api/realtime/events/realtime-events-route-get");
      vi.resetModules();
    }
  });

  it("delegates authorized realtime requests through the real route wrapper", async () => {
    vi.resetModules();

    const getSessionUserMock = vi.fn().mockResolvedValue({ id: "user-1" });
    const handleRealtimeEventsRouteGetMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    vi.doMock("@/lib/workspace", () => ({
      getSessionUser: getSessionUserMock,
    }));
    vi.doMock("@/app/api/realtime/events/realtime-events-route-get", () => ({
      handleRealtimeEventsRouteGet: handleRealtimeEventsRouteGetMock,
    }));

    try {
      const { GET } = await import("@/app/api/realtime/events/route");
      const request = new Request(
        "http://localhost:3003/api/realtime/events?workspaceUuid=workspace-1"
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(handleRealtimeEventsRouteGetMock).toHaveBeenCalledWith({
        request,
        userId: "user-1",
      });
    } finally {
      vi.doUnmock("@/lib/workspace");
      vi.doUnmock("@/app/api/realtime/events/realtime-events-route-get");
      vi.resetModules();
    }
  });

  it("fails closed when realtime files-token session lookup throws before token handling begins", async () => {
    vi.resetModules();

    const getSessionUserMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("realtime files token auth offline"));
    const handleRealtimeFilesTokenRoutePostMock = vi.fn();

    vi.doMock("@/lib/workspace", () => ({
      getSessionUser: getSessionUserMock,
    }));
    vi.doMock(
      "@/app/api/realtime/files-token/realtime-files-token-route-post",
      () => ({
        handleRealtimeFilesTokenRoutePost:
          handleRealtimeFilesTokenRoutePostMock,
      })
    );

    try {
      const { POST } = await import("@/app/api/realtime/files-token/route");

      const response = await POST(new Request("http://localhost:3003"));

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "realtime files token auth offline",
      });
      expect(handleRealtimeFilesTokenRoutePostMock).not.toHaveBeenCalled();
    } finally {
      vi.doUnmock("@/lib/workspace");
      vi.doUnmock(
        "@/app/api/realtime/files-token/realtime-files-token-route-post"
      );
      vi.resetModules();
    }
  });

  it("delegates authorized realtime files-token requests through the real route wrapper", async () => {
    vi.resetModules();

    const getSessionUserMock = vi.fn().mockResolvedValue({ id: "user-1" });
    const handleRealtimeFilesTokenRoutePostMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ token: "signed" }));

    vi.doMock("@/lib/workspace", () => ({
      getSessionUser: getSessionUserMock,
    }));
    vi.doMock(
      "@/app/api/realtime/files-token/realtime-files-token-route-post",
      () => ({
        handleRealtimeFilesTokenRoutePost:
          handleRealtimeFilesTokenRoutePostMock,
      })
    );

    try {
      const { POST } = await import("@/app/api/realtime/files-token/route");
      const request = new Request(
        "http://localhost:3003/api/realtime/files-token",
        {
          method: "POST",
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(handleRealtimeFilesTokenRoutePostMock).toHaveBeenCalledWith({
        request,
        userId: "user-1",
      });
    } finally {
      vi.doUnmock("@/lib/workspace");
      vi.doUnmock(
        "@/app/api/realtime/files-token/realtime-files-token-route-post"
      );
      vi.resetModules();
    }
  });

  it("fails closed when realtime files wrapper handling throws before the stream response is created", async () => {
    vi.resetModules();

    const handleRealtimeFilesRouteGetMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("realtime files handler offline"));

    vi.doMock("@/app/api/realtime/files/realtime-files-route-get", () => ({
      handleRealtimeFilesRouteGet: handleRealtimeFilesRouteGetMock,
    }));

    try {
      const { GET } = await import("@/app/api/realtime/files/route");

      const response = await GET(new Request("http://localhost:3003"));

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "realtime files handler offline",
      });
    } finally {
      vi.doUnmock("@/app/api/realtime/files/realtime-files-route-get");
      vi.resetModules();
    }
  });

  it("delegates successful realtime files requests through the real route wrapper", async () => {
    vi.resetModules();

    const handleRealtimeFilesRouteGetMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ ok: true }));

    vi.doMock("@/app/api/realtime/files/realtime-files-route-get", () => ({
      handleRealtimeFilesRouteGet: handleRealtimeFilesRouteGetMock,
    }));

    try {
      const { GET } = await import("@/app/api/realtime/files/route");
      const request = new Request(
        "http://localhost:3003/api/realtime/files?workspaceUuid=workspace-1&token=signed"
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(handleRealtimeFilesRouteGetMock).toHaveBeenCalledWith(request);
    } finally {
      vi.doUnmock("@/app/api/realtime/files/realtime-files-route-get");
      vi.resetModules();
    }
  });
});
