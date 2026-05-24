import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getFileAssetByIdMock,
  getFolderWithAncestorsMock,
  getSessionUserMock,
  invalidateWorkspaceReadCachesMock,
  isSharedFilesVirtualFolderIdMock,
  publishFilesInvalidationEventMock,
  softDeleteFileAssetMock,
  softDeleteFolderMock,
  updateFileAssetMock,
  updateFolderMock,
  userCanEditFileMock,
  userCanEditFolderMock,
} = vi.hoisted(() => ({
  getFileAssetByIdMock: vi.fn(),
  getFolderWithAncestorsMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  invalidateWorkspaceReadCachesMock: vi.fn(),
  isSharedFilesVirtualFolderIdMock: vi.fn(),
  publishFilesInvalidationEventMock: vi.fn(),
  softDeleteFileAssetMock: vi.fn(),
  softDeleteFolderMock: vi.fn(),
  updateFileAssetMock: vi.fn(),
  updateFolderMock: vi.fn(),
  userCanEditFileMock: vi.fn(),
  userCanEditFolderMock: vi.fn(),
}));

vi.mock("@/lib/domain-cache", () => ({
  invalidateWorkspaceReadCaches: invalidateWorkspaceReadCachesMock,
}));

vi.mock("@/lib/file-data", () => ({
  getFileAssetById: getFileAssetByIdMock,
  getFolderWithAncestors: getFolderWithAncestorsMock,
  isSharedFilesVirtualFolderId: isSharedFilesVirtualFolderIdMock,
  softDeleteFileAsset: softDeleteFileAssetMock,
  softDeleteFolder: softDeleteFolderMock,
  updateFileAsset: updateFileAssetMock,
  updateFolder: updateFolderMock,
  userCanEditFile: userCanEditFileMock,
  userCanEditFolder: userCanEditFolderMock,
}));

vi.mock("@/lib/files-realtime-publisher", () => ({
  publishFilesInvalidationEvent: publishFilesInvalidationEventMock,
}));

vi.mock("@/lib/workspace", () => ({
  getSessionUser: getSessionUserMock,
}));

import { POST } from "./route";

const WORKSPACE_UUID = "919ed32c-fb5a-4fe1-98aa-db048a6e71cc";
const FILE_UUID = "0460c632-b0f0-4287-8812-ecad7898c665";
const bulkRouteFile = resolve(import.meta.dirname, "./route.ts");
const bulkRouteModelFile = resolve(
  import.meta.dirname,
  "./workspace-items-bulk-route-model.ts"
);
const BULK_ROUTE_PARAMS = {
  params: Promise.resolve({ workspaceUuid: WORKSPACE_UUID }),
};

function routeRequest(body: Record<string, unknown>) {
  return new Request(
    `http://localhost:3003/api/workspaces/${WORKSPACE_UUID}/items/bulk`,
    {
      body: JSON.stringify(body),
      method: "POST",
    }
  );
}

describe("/api/workspaces/[workspaceUuid]/items/bulk route", () => {
  beforeEach(() => {
    getFileAssetByIdMock.mockReset();
    getFolderWithAncestorsMock.mockReset();
    getSessionUserMock.mockReset();
    invalidateWorkspaceReadCachesMock.mockReset();
    isSharedFilesVirtualFolderIdMock.mockReset();
    publishFilesInvalidationEventMock.mockReset();
    softDeleteFileAssetMock.mockReset();
    softDeleteFolderMock.mockReset();
    updateFileAssetMock.mockReset();
    updateFolderMock.mockReset();
    userCanEditFileMock.mockReset();
    userCanEditFolderMock.mockReset();

    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    invalidateWorkspaceReadCachesMock.mockResolvedValue(undefined);
    isSharedFilesVirtualFolderIdMock.mockReturnValue(false);
    publishFilesInvalidationEventMock.mockResolvedValue(undefined);
  });

  it("fails closed when session lookup throws before bulk item handling begins", async () => {
    getSessionUserMock.mockRejectedValueOnce(new Error("bulk auth offline"));

    const response = await POST(
      routeRequest({
        items: [{ id: FILE_UUID, kind: "file" }],
        operation: "delete",
      }),
      BULK_ROUTE_PARAMS
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "bulk auth offline",
    });
    expect(userCanEditFileMock).not.toHaveBeenCalled();
    expect(getFileAssetByIdMock).not.toHaveBeenCalled();
    expect(updateFileAssetMock).not.toHaveBeenCalled();
    expect(softDeleteFileAssetMock).not.toHaveBeenCalled();
    expect(invalidateWorkspaceReadCachesMock).not.toHaveBeenCalled();
    expect(publishFilesInvalidationEventMock).not.toHaveBeenCalled();
  });

  it("invalidates workspace read caches after a successful bulk delete", async () => {
    userCanEditFileMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockResolvedValue({ id: FILE_UUID });
    softDeleteFileAssetMock.mockResolvedValue(true);

    const response = await POST(
      routeRequest({
        items: [{ id: FILE_UUID, kind: "file" }],
        operation: "delete",
      }),
      BULK_ROUTE_PARAMS
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      summary: { failed: 0, succeeded: 1, total: 1 },
    });
    expect(invalidateWorkspaceReadCachesMock).toHaveBeenCalledWith(
      WORKSPACE_UUID
    );
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(1, {
      fileId: FILE_UUID,
      reason: "file.deleted",
      workspaceUuid: WORKSPACE_UUID,
    });
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(2, {
      reason: "tree.changed",
      workspaceUuid: WORKSPACE_UUID,
    });
  });

  it("returns a 500 json error when move target permission lookup throws before item processing", async () => {
    userCanEditFolderMock.mockRejectedValueOnce(
      new Error("target access offline")
    );

    const response = await POST(
      routeRequest({
        items: [{ id: FILE_UUID, kind: "file" }],
        operation: "move",
        targetFolderId: "cb6af47f-74b5-4a7c-9225-1e79685aa33e",
      }),
      BULK_ROUTE_PARAMS
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "target access offline",
    });
    expect(updateFileAssetMock).not.toHaveBeenCalled();
    expect(updateFolderMock).not.toHaveBeenCalled();
  });

  it("invalidates workspace read caches after a successful bulk move with specific update events", async () => {
    userCanEditFolderMock.mockResolvedValue(true);
    userCanEditFileMock.mockResolvedValue(true);
    updateFileAssetMock.mockResolvedValue({ id: FILE_UUID });

    const response = await POST(
      routeRequest({
        items: [{ id: FILE_UUID, kind: "file" }],
        operation: "move",
        targetFolderId: "cb6af47f-74b5-4a7c-9225-1e79685aa33e",
      }),
      BULK_ROUTE_PARAMS
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      summary: { failed: 0, succeeded: 1, total: 1 },
    });
    expect(updateFileAssetMock).toHaveBeenCalledWith(
      WORKSPACE_UUID,
      FILE_UUID,
      "user-1",
      {
        folderId: "cb6af47f-74b5-4a7c-9225-1e79685aa33e",
      }
    );
    expect(invalidateWorkspaceReadCachesMock).toHaveBeenCalledWith(
      WORKSPACE_UUID
    );
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(1, {
      fileId: FILE_UUID,
      reason: "file.updated",
      workspaceUuid: WORKSPACE_UUID,
    });
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(2, {
      reason: "tree.changed",
      workspaceUuid: WORKSPACE_UUID,
    });
  });

  it("fails folder moves cleanly when the target is the folder itself or one of its descendants", async () => {
    const folderId = "44444444-4444-4444-8444-444444444444";
    const descendantId = "55555555-5555-4555-8555-555555555555";

    userCanEditFolderMock.mockResolvedValue(true);
    getFolderWithAncestorsMock.mockResolvedValue({
      ancestors: [{ id: folderId }],
      folder: { id: descendantId },
    });

    let response = await POST(
      routeRequest({
        items: [{ id: folderId, kind: "folder" }],
        operation: "move",
        targetFolderId: folderId,
      }),
      BULK_ROUTE_PARAMS
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      results: [
        {
          error: "Cannot move a folder into itself",
          id: folderId,
          kind: "folder",
          status: "failed",
        },
      ],
      summary: { failed: 1, succeeded: 0, total: 1 },
    });
    expect(getFolderWithAncestorsMock).not.toHaveBeenCalled();
    expect(updateFolderMock).not.toHaveBeenCalled();
    expect(invalidateWorkspaceReadCachesMock).not.toHaveBeenCalled();
    expect(publishFilesInvalidationEventMock).not.toHaveBeenCalled();

    getFolderWithAncestorsMock.mockClear();
    updateFolderMock.mockClear();

    response = await POST(
      routeRequest({
        items: [{ id: folderId, kind: "folder" }],
        operation: "move",
        targetFolderId: descendantId,
      }),
      BULK_ROUTE_PARAMS
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      results: [
        {
          error: "Cannot move a folder into its descendant",
          id: folderId,
          kind: "folder",
          status: "failed",
        },
      ],
      summary: { failed: 1, succeeded: 0, total: 1 },
    });
    expect(getFolderWithAncestorsMock).toHaveBeenCalledWith(
      WORKSPACE_UUID,
      descendantId,
      "user-1"
    );
    expect(updateFolderMock).not.toHaveBeenCalled();
    expect(invalidateWorkspaceReadCachesMock).not.toHaveBeenCalled();
    expect(publishFilesInvalidationEventMock).not.toHaveBeenCalled();
  });

  it("does not invalidate workspace read caches when every bulk item fails", async () => {
    userCanEditFileMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockResolvedValue(null);

    const response = await POST(
      routeRequest({
        items: [{ id: FILE_UUID, kind: "file" }],
        operation: "delete",
      }),
      BULK_ROUTE_PARAMS
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      summary: { failed: 1, succeeded: 0, total: 1 },
    });
    expect(invalidateWorkspaceReadCachesMock).not.toHaveBeenCalled();
    expect(publishFilesInvalidationEventMock).not.toHaveBeenCalled();
  });

  it("returns a 500 json error when post-success cache invalidation throws", async () => {
    userCanEditFileMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockResolvedValue({ id: FILE_UUID });
    softDeleteFileAssetMock.mockResolvedValue(true);
    invalidateWorkspaceReadCachesMock.mockRejectedValueOnce(
      new Error("bulk cache offline")
    );

    const response = await POST(
      routeRequest({
        items: [{ id: FILE_UUID, kind: "file" }],
        operation: "delete",
      }),
      BULK_ROUTE_PARAMS
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "bulk cache offline",
    });
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(1, {
      fileId: FILE_UUID,
      reason: "file.deleted",
      workspaceUuid: WORKSPACE_UUID,
    });
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(2, {
      reason: "tree.changed",
      workspaceUuid: WORKSPACE_UUID,
    });
  });

  it("keeps the bulk route fallback helper in the dedicated route model file", () => {
    const routeSource = readFileSync(bulkRouteFile, "utf8");

    expect(routeSource).toContain('from "./workspace-items-bulk-route-model"');
    expect(routeSource).not.toContain(
      'const WORKSPACE_BULK_OPERATION_ERROR = "Bulk operation failed"'
    );
    expect(existsSync(bulkRouteModelFile)).toBe(true);
  });
});
