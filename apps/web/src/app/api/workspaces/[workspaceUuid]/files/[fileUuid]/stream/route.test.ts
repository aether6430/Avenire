import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureWorkspaceAccessForUserMock,
  fetchMock,
  getFileAssetByIdMock,
  getNoteContentMock,
  getSessionUserMock,
  isMarkdownFileRecordMock,
  isTrustedStorageUrlMock,
} = vi.hoisted(() => ({
  ensureWorkspaceAccessForUserMock: vi.fn(),
  fetchMock: vi.fn(),
  getFileAssetByIdMock: vi.fn(),
  getNoteContentMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  isMarkdownFileRecordMock: vi.fn(),
  isTrustedStorageUrlMock: vi.fn(),
}));

vi.mock("@/lib/file-data", () => ({
  getFileAssetById: getFileAssetByIdMock,
  getNoteContent: getNoteContentMock,
  isMarkdownFileRecord: isMarkdownFileRecordMock,
  isTrustedStorageUrl: isTrustedStorageUrlMock,
}));

vi.mock("@/lib/workspace", () => ({
  ensureWorkspaceAccessForUser: ensureWorkspaceAccessForUserMock,
  getSessionUser: getSessionUserMock,
}));

import { GET } from "./route";

describe("/api/workspaces/[workspaceUuid]/files/[fileUuid]/stream route", () => {
  beforeEach(() => {
    ensureWorkspaceAccessForUserMock.mockReset();
    fetchMock.mockReset();
    getFileAssetByIdMock.mockReset();
    getNoteContentMock.mockReset();
    getSessionUserMock.mockReset();
    isMarkdownFileRecordMock.mockReset();
    isTrustedStorageUrlMock.mockReset();

    vi.stubGlobal("fetch", fetchMock);
    isTrustedStorageUrlMock.mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns unauthorized when there is no signed-in user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await GET(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/file-1/stream"
      ),
      {
        params: Promise.resolve({
          workspaceUuid: "workspace-1",
          fileUuid: "file-1",
        }),
      }
    );

    expect(response.status).toBe(401);
    await expect(response.text()).resolves.toBe("Unauthorized");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns forbidden when the user cannot access the workspace", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(false);

    const response = await GET(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/file-1/stream"
      ),
      {
        params: Promise.resolve({
          workspaceUuid: "workspace-1",
          fileUuid: "file-1",
        }),
      }
    );

    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toBe("Forbidden");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("serves markdown-backed files directly from note content without hitting upstream storage", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockResolvedValue({
      id: "file-1",
      storageUrl: "https://cdn.example.com/file.md",
    });
    isMarkdownFileRecordMock.mockReturnValue(true);
    getNoteContentMock.mockResolvedValue({ content: "# Notes" });

    const response = await GET(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/file-1/stream"
      ),
      {
        params: Promise.resolve({
          workspaceUuid: "workspace-1",
          fileUuid: "file-1",
        }),
      }
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("# Notes");
    expect(response.headers.get("content-type")).toBe(
      "text/markdown; charset=utf-8"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects untrusted file sources before attempting upstream fetches", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockResolvedValue({
      id: "file-1",
      storageUrl: "https://untrusted.example.com/file.pdf",
    });
    isMarkdownFileRecordMock.mockReturnValue(false);
    isTrustedStorageUrlMock.mockReturnValue(false);

    const response = await GET(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/file-1/stream"
      ),
      {
        params: Promise.resolve({
          workspaceUuid: "workspace-1",
          fileUuid: "file-1",
        }),
      }
    );

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe("Invalid file source");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forces a startup range for cold media requests and passes through upstream streaming headers", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockResolvedValue({
      id: "file-1",
      storageUrl: "https://cdn.example.com/video.mp4",
      mimeType: "video/mp4",
      sizeBytes: 9_000_000,
    });
    isMarkdownFileRecordMock.mockReturnValue(false);
    fetchMock.mockResolvedValue(
      new Response("video-stream", {
        status: 206,
        headers: {
          "accept-ranges": "bytes",
          "content-length": "11",
          "content-range": "bytes 0-10/9000000",
          "content-type": "video/mp4",
        },
      })
    );

    const response = await GET(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/file-1/stream"
      ),
      {
        params: Promise.resolve({
          workspaceUuid: "workspace-1",
          fileUuid: "file-1",
        }),
      }
    );

    expect(response.status).toBe(206);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://cdn.example.com/video.mp4",
      expect.objectContaining({
        headers: expect.any(Headers),
        redirect: "follow",
        signal: expect.any(AbortSignal),
      })
    );
    const fetchOptions = fetchMock.mock.calls[0]?.[1] as {
      headers: Headers;
    };
    expect(fetchOptions.headers.get("Range")).toBe("bytes=0-4194303");
    expect(response.headers.get("content-type")).toBe("video/mp4");
    expect(response.headers.get("content-range")).toBe("bytes 0-10/9000000");
    expect(response.headers.get("accept-ranges")).toBe("bytes");
  });

  it("normalizes explicit ranges and marks when upstream falls back to full-file responses", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockResolvedValue({
      id: "file-1",
      storageUrl: "https://cdn.example.com/file.pdf",
      mimeType: "application/pdf",
      sizeBytes: 100,
    });
    isMarkdownFileRecordMock.mockReturnValue(false);
    fetchMock.mockResolvedValue(
      new Response("pdf-stream", {
        status: 200,
        headers: {
          "content-length": "10",
          "content-type": "application/pdf",
        },
      })
    );

    const response = await GET(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/file-1/stream",
        {
          headers: {
            Range: "bytes=10-999999",
          },
        }
      ),
      {
        params: Promise.resolve({
          workspaceUuid: "workspace-1",
          fileUuid: "file-1",
        }),
      }
    );

    expect(response.status).toBe(200);
    const fetchOptions = fetchMock.mock.calls[0]?.[1] as {
      headers: Headers;
    };
    expect(fetchOptions.headers.get("Range")).toBe("bytes=10-99");
    expect(response.headers.get("x-avenire-range-supported")).toBe("false");
    expect(response.headers.get("accept-ranges")).toBe("bytes");
  });
});
