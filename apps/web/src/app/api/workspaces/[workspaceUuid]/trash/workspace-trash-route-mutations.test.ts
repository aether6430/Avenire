import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  invalidateWorkspaceReadCachesMock,
  permanentlyDeleteFileAssetMock,
  permanentlyDeleteFolderMock,
  publishFilesInvalidationEventMock,
  restoreFileAssetMock,
  restoreFolderMock,
} = vi.hoisted(() => ({
  invalidateWorkspaceReadCachesMock: vi.fn(),
  permanentlyDeleteFileAssetMock: vi.fn(),
  permanentlyDeleteFolderMock: vi.fn(),
  publishFilesInvalidationEventMock: vi.fn(),
  restoreFileAssetMock: vi.fn(),
  restoreFolderMock: vi.fn(),
}));

vi.mock("@/lib/domain-cache", () => ({
  invalidateWorkspaceReadCaches: invalidateWorkspaceReadCachesMock,
}));

vi.mock("@/lib/file-data", () => ({
  permanentlyDeleteFileAsset: permanentlyDeleteFileAssetMock,
  permanentlyDeleteFolder: permanentlyDeleteFolderMock,
  restoreFileAsset: restoreFileAssetMock,
  restoreFolder: restoreFolderMock,
}));

vi.mock("@/lib/files-realtime-publisher", () => ({
  publishFilesInvalidationEvent: publishFilesInvalidationEventMock,
}));

vi.mock("@avenire/storage", () => ({
  UTApi: vi.fn(),
}));

import {
  handleWorkspaceTrashRouteDelete,
  handleWorkspaceTrashRouteRestore,
} from "./workspace-trash-route-mutations";

const WORKSPACE_UUID = "919ed32c-fb5a-4fe1-98aa-db048a6e71cc";
const FILE_UUID = "0460c632-b0f0-4287-8812-ecad7898c665";

describe("workspace trash route mutations", () => {
  beforeEach(() => {
    invalidateWorkspaceReadCachesMock.mockReset();
    permanentlyDeleteFileAssetMock.mockReset();
    permanentlyDeleteFolderMock.mockReset();
    publishFilesInvalidationEventMock.mockReset();
    restoreFileAssetMock.mockReset();
    restoreFolderMock.mockReset();

    invalidateWorkspaceReadCachesMock.mockResolvedValue(undefined);
    publishFilesInvalidationEventMock.mockResolvedValue(undefined);
  });

  it("invalidates workspace read caches after restoring an item", async () => {
    restoreFileAssetMock.mockResolvedValue(true);

    const response = await handleWorkspaceTrashRouteRestore({
      body: {
        items: [{ id: FILE_UUID, kind: "file" }],
        operation: "restore",
      },
      workspaceUuid: WORKSPACE_UUID,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      results: [{ id: FILE_UUID, kind: "file", ok: true }],
    });
    expect(invalidateWorkspaceReadCachesMock).toHaveBeenCalledWith(
      WORKSPACE_UUID
    );
    expect(publishFilesInvalidationEventMock).toHaveBeenCalledWith({
      reason: "tree.changed",
      workspaceUuid: WORKSPACE_UUID,
    });
  });

  it("invalidates workspace read caches after permanently deleting an item", async () => {
    permanentlyDeleteFileAssetMock.mockResolvedValue({ storageKeys: [] });

    const response = await handleWorkspaceTrashRouteDelete({
      body: {
        items: [{ id: FILE_UUID, kind: "file" }],
        operation: "delete",
      },
      workspaceUuid: WORKSPACE_UUID,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      results: [{ id: FILE_UUID, kind: "file", ok: true }],
    });
    expect(invalidateWorkspaceReadCachesMock).toHaveBeenCalledWith(
      WORKSPACE_UUID
    );
    expect(publishFilesInvalidationEventMock).toHaveBeenCalledWith({
      reason: "tree.changed",
      workspaceUuid: WORKSPACE_UUID,
    });
  });
});
