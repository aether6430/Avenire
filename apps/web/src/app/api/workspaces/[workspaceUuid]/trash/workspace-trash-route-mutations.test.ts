import { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  deleteStorageFilesMock,
  invalidateWorkspaceReadCachesMock,
  permanentlyDeleteFileAssetMock,
  permanentlyDeleteFolderMock,
  publishFilesInvalidationEventMock,
  restoreFileAssetMock,
  restoreFolderMock,
} = vi.hoisted(() => ({
  deleteStorageFilesMock: vi.fn(),
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
  deleteStorageFiles: deleteStorageFilesMock,
}));

import {
  handleWorkspaceTrashRouteDelete,
  handleWorkspaceTrashRouteRestore,
} from "./workspace-trash-route-mutations";

const WORKSPACE_UUID = "919ed32c-fb5a-4fe1-98aa-db048a6e71cc";
const FILE_UUID = "0460c632-b0f0-4287-8812-ecad7898c665";

describe("workspace trash route mutations", () => {
  const originalUploadThingToken = process.env.UPLOADTHING_TOKEN;

  beforeEach(() => {
    deleteStorageFilesMock.mockReset();
    invalidateWorkspaceReadCachesMock.mockReset();
    permanentlyDeleteFileAssetMock.mockReset();
    permanentlyDeleteFolderMock.mockReset();
    publishFilesInvalidationEventMock.mockReset();
    restoreFileAssetMock.mockReset();
    restoreFolderMock.mockReset();

    invalidateWorkspaceReadCachesMock.mockResolvedValue(undefined);
    publishFilesInvalidationEventMock.mockResolvedValue(undefined);
    process.env.UPLOADTHING_TOKEN = "uploadthing-token";
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
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(1, {
      fileId: FILE_UUID,
      reason: "file.created",
      workspaceUuid: WORKSPACE_UUID,
    });
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(2, {
      reason: "tree.changed",
      workspaceUuid: WORKSPACE_UUID,
    });
  });

  it("invalidates workspace read caches after permanently deleting an item", async () => {
    permanentlyDeleteFileAssetMock.mockResolvedValue({
      storageKeys: ["storage-key-1"],
    });

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
    expect(deleteStorageFilesMock).toHaveBeenCalledWith(["storage-key-1"]);
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

  it("fails closed when route-level session, access, or delegated trash handling throws", async () => {
    vi.resetModules();

    const ensureWorkspaceAccessForUserMock = vi.fn();
    const getSessionUserMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("trash auth offline"))
      .mockResolvedValueOnce({ id: "user-1" })
      .mockResolvedValueOnce({ id: "user-1" });
    const handleWorkspaceTrashRouteGetMock = vi.fn();
    const handleWorkspaceTrashRouteRestoreMock = vi.fn();
    const handleWorkspaceTrashRouteDeleteMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("trash delete offline"));

    ensureWorkspaceAccessForUserMock
      .mockRejectedValueOnce(new Error("trash access offline"))
      .mockResolvedValueOnce(true);

    vi.doMock("@/lib/workspace", () => ({
      ensureWorkspaceAccessForUser: ensureWorkspaceAccessForUserMock,
      getSessionUser: getSessionUserMock,
    }));
    vi.doMock("./workspace-trash-route-get", () => ({
      handleWorkspaceTrashRouteGet: handleWorkspaceTrashRouteGetMock,
    }));
    vi.doMock("./workspace-trash-route-mutations", () => ({
      handleWorkspaceTrashRouteDelete: handleWorkspaceTrashRouteDeleteMock,
      handleWorkspaceTrashRouteRestore: handleWorkspaceTrashRouteRestoreMock,
    }));

    try {
      const { DELETE, GET, POST } = await import("./route");

      let response = await GET(new Request("http://localhost:3003"), {
        params: Promise.resolve({ workspaceUuid: WORKSPACE_UUID }),
      });

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "trash auth offline",
      });
      expect(ensureWorkspaceAccessForUserMock).not.toHaveBeenCalled();
      expect(handleWorkspaceTrashRouteGetMock).not.toHaveBeenCalled();

      response = await POST(
        new Request("http://localhost:3003", {
          method: "POST",
          body: JSON.stringify({
            items: [{ id: FILE_UUID, kind: "file" }],
            operation: "restore",
          }),
        }),
        {
          params: Promise.resolve({ workspaceUuid: WORKSPACE_UUID }),
        }
      );

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "trash access offline",
      });
      expect(handleWorkspaceTrashRouteRestoreMock).not.toHaveBeenCalled();

      response = await DELETE(
        new Request("http://localhost:3003", {
          method: "DELETE",
          body: JSON.stringify({
            items: [{ id: FILE_UUID, kind: "file" }],
            operation: "delete",
          }),
        }),
        {
          params: Promise.resolve({ workspaceUuid: WORKSPACE_UUID }),
        }
      );

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "trash delete offline",
      });
      expect(handleWorkspaceTrashRouteDeleteMock).toHaveBeenCalledWith({
        body: {
          items: [{ id: FILE_UUID, kind: "file" }],
          operation: "delete",
        },
        workspaceUuid: WORKSPACE_UUID,
      });
    } finally {
      vi.doUnmock("@/lib/workspace");
      vi.doUnmock("./workspace-trash-route-get");
      vi.doUnmock("./workspace-trash-route-mutations");
      vi.resetModules();
    }
  });

  it("delegates get, restore, and delete requests through the real trash route wrapper", async () => {
    vi.resetModules();

    const ensureWorkspaceAccessForUserMock = vi.fn().mockResolvedValue(true);
    const getSessionUserMock = vi.fn().mockResolvedValue({ id: "user-1" });
    const handleWorkspaceTrashRouteGetMock = vi
      .fn()
      .mockResolvedValueOnce(
        NextResponse.json({ items: [{ id: FILE_UUID }] }, { status: 200 })
      );
    const handleWorkspaceTrashRouteRestoreMock = vi
      .fn()
      .mockResolvedValueOnce(
        NextResponse.json({ ok: true, phase: "restore" }, { status: 200 })
      );
    const handleWorkspaceTrashRouteDeleteMock = vi
      .fn()
      .mockResolvedValueOnce(
        NextResponse.json({ ok: true, phase: "delete" }, { status: 200 })
      );

    vi.doMock("@/lib/workspace", () => ({
      ensureWorkspaceAccessForUser: ensureWorkspaceAccessForUserMock,
      getSessionUser: getSessionUserMock,
    }));
    vi.doMock("./workspace-trash-route-get", () => ({
      handleWorkspaceTrashRouteGet: handleWorkspaceTrashRouteGetMock,
    }));
    vi.doMock("./workspace-trash-route-mutations", () => ({
      handleWorkspaceTrashRouteDelete: handleWorkspaceTrashRouteDeleteMock,
      handleWorkspaceTrashRouteRestore: handleWorkspaceTrashRouteRestoreMock,
    }));

    try {
      const { DELETE, GET, POST } = await import("./route");

      let response = await GET(new Request("http://localhost:3003"), {
        params: Promise.resolve({ workspaceUuid: WORKSPACE_UUID }),
      });

      expect(response.status).toBe(200);
      expect(handleWorkspaceTrashRouteGetMock).toHaveBeenCalledWith({
        workspaceUuid: WORKSPACE_UUID,
      });

      response = await POST(
        new Request("http://localhost:3003", {
          method: "POST",
          body: JSON.stringify({
            items: [{ id: FILE_UUID, kind: "file" }],
            operation: "restore",
          }),
        }),
        {
          params: Promise.resolve({ workspaceUuid: WORKSPACE_UUID }),
        }
      );

      expect(response.status).toBe(200);
      expect(handleWorkspaceTrashRouteRestoreMock).toHaveBeenCalledWith({
        body: {
          items: [{ id: FILE_UUID, kind: "file" }],
          operation: "restore",
        },
        workspaceUuid: WORKSPACE_UUID,
      });

      response = await DELETE(
        new Request("http://localhost:3003", {
          method: "DELETE",
          body: JSON.stringify({
            items: [{ id: FILE_UUID, kind: "file" }],
            operation: "delete",
          }),
        }),
        {
          params: Promise.resolve({ workspaceUuid: WORKSPACE_UUID }),
        }
      );

      expect(response.status).toBe(200);
      expect(handleWorkspaceTrashRouteDeleteMock).toHaveBeenCalledWith({
        body: {
          items: [{ id: FILE_UUID, kind: "file" }],
          operation: "delete",
        },
        workspaceUuid: WORKSPACE_UUID,
      });
      expect(ensureWorkspaceAccessForUserMock).toHaveBeenNthCalledWith(
        1,
        "user-1",
        WORKSPACE_UUID
      );
      expect(ensureWorkspaceAccessForUserMock).toHaveBeenNthCalledWith(
        2,
        "user-1",
        WORKSPACE_UUID
      );
      expect(ensureWorkspaceAccessForUserMock).toHaveBeenNthCalledWith(
        3,
        "user-1",
        WORKSPACE_UUID
      );
    } finally {
      vi.doUnmock("@/lib/workspace");
      vi.doUnmock("./workspace-trash-route-get");
      vi.doUnmock("./workspace-trash-route-mutations");
      vi.resetModules();
    }
  });

  afterEach(() => {
    if (originalUploadThingToken === undefined) {
      Reflect.deleteProperty(process.env, "UPLOADTHING_TOKEN");
      return;
    }

    process.env.UPLOADTHING_TOKEN = originalUploadThingToken;
  });
});
