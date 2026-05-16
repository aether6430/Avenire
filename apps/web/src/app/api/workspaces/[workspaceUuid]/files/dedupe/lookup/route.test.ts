import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureWorkspaceAccessForUserMock,
  getFileAssetByContentHashMock,
  getSessionUserMock,
} = vi.hoisted(() => ({
  ensureWorkspaceAccessForUserMock: vi.fn(),
  getFileAssetByContentHashMock: vi.fn(),
  getSessionUserMock: vi.fn(),
}));

vi.mock("@/lib/file-data", () => ({
  getFileAssetByContentHash: getFileAssetByContentHashMock,
}));

vi.mock("@/lib/workspace", () => ({
  ensureWorkspaceAccessForUser: ensureWorkspaceAccessForUserMock,
  getSessionUser: getSessionUserMock,
}));

import { POST } from "./route";

describe("/api/workspaces/[workspaceUuid]/files/dedupe/lookup route", () => {
  beforeEach(() => {
    ensureWorkspaceAccessForUserMock.mockReset();
    getFileAssetByContentHashMock.mockReset();
    getSessionUserMock.mockReset();

    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
  });

  it("returns unauthorized when there is no signed-in user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await POST(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/dedupe/lookup",
        { method: "POST", body: "{}" }
      ),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns forbidden when the user cannot access the workspace", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(false);

    const response = await POST(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/dedupe/lookup",
        { method: "POST", body: "{}" }
      ),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("returns invalid payload for malformed requests", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });

    const response = await POST(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/dedupe/lookup",
        {
          method: "POST",
          body: JSON.stringify({
            files: [{ clientUploadId: "upload-1" }],
          }),
        }
      ),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid payload",
    });
  });

  it("returns dedupe misses when no matching file exists", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    getFileAssetByContentHashMock.mockResolvedValue(null);

    const response = await POST(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/dedupe/lookup",
        {
          method: "POST",
          body: JSON.stringify({
            files: [
              {
                clientUploadId: "upload-1",
                folderId: "11111111-1111-4111-8111-111111111111",
                hashSha256:
                  "abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
                mimeType: "application/pdf",
                name: "Doc.pdf",
                sizeBytes: 42,
              },
            ],
          }),
        }
      ),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      results: [{ clientUploadId: "upload-1", deduped: false }],
    });
  });

  it("normalizes hashes and returns dedupe hits with file summaries", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    getFileAssetByContentHashMock.mockResolvedValue({
      folderId: "folder-1",
      id: "file-1",
      mimeType: "application/pdf",
      name: "Existing.pdf",
      sizeBytes: 99,
      storageUrl: "https://cdn.example.com/file-1",
    });

    const response = await POST(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/dedupe/lookup",
        {
          method: "POST",
          body: JSON.stringify({
            files: [
              {
                clientUploadId: "upload-2",
                folderId: "11111111-1111-4111-8111-111111111111",
                hashSha256:
                  " ABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD ",
                mimeType: "application/pdf",
                name: "Doc.pdf",
                sizeBytes: 42,
              },
            ],
          }),
        }
      ),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(getFileAssetByContentHashMock).toHaveBeenCalledWith(
      "workspace-1",
      "abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd"
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      results: [
        {
          clientUploadId: "upload-2",
          deduped: true,
          file: {
            folderId: "folder-1",
            id: "file-1",
            mimeType: "application/pdf",
            name: "Existing.pdf",
            sizeBytes: 99,
            storageUrl: "https://cdn.example.com/file-1",
          },
        },
      ],
    });
  });
});
