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
    expect(publishFilesInvalidationEventMock).toHaveBeenCalledWith({
      reason: "tree.changed",
      workspaceUuid: WORKSPACE_UUID,
    });
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
});
