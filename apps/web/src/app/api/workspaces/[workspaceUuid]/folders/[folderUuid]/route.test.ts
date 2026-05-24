import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createRouteCacheKeyMock,
  getCachedRouteMock,
  getFolderWithAncestorsMock,
  getIngestionFlagsByFileIdsMock,
  getRouteCacheVersionMock,
  getSessionUserMock,
  invalidateWorkspaceReadCachesMock,
  isMarkdownFileRecordMock,
  isSharedFilesVirtualFolderIdMock,
  listFolderContentsForUserMock,
  listNoteContentByFileIdsMock,
  listWorkspaceMembersMock,
  publishFilesInvalidationEventMock,
  setCachedRouteMock,
  softDeleteFolderMock,
  updateFolderMock,
  userCanEditFolderMock,
  userCanViewFolderMock,
} = vi.hoisted(() => ({
  createRouteCacheKeyMock: vi.fn(),
  getCachedRouteMock: vi.fn(),
  getFolderWithAncestorsMock: vi.fn(),
  getIngestionFlagsByFileIdsMock: vi.fn(),
  getRouteCacheVersionMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  invalidateWorkspaceReadCachesMock: vi.fn(),
  isMarkdownFileRecordMock: vi.fn(),
  isSharedFilesVirtualFolderIdMock: vi.fn(),
  listFolderContentsForUserMock: vi.fn(),
  listNoteContentByFileIdsMock: vi.fn(),
  listWorkspaceMembersMock: vi.fn(),
  publishFilesInvalidationEventMock: vi.fn(),
  setCachedRouteMock: vi.fn(),
  softDeleteFolderMock: vi.fn(),
  updateFolderMock: vi.fn(),
  userCanEditFolderMock: vi.fn(),
  userCanViewFolderMock: vi.fn(),
}));

vi.mock("@avenire/database", () => ({
  getIngestionFlagsByFileIds: getIngestionFlagsByFileIdsMock,
}));

vi.mock("@/lib/domain-cache", () => ({
  CACHE_NAMESPACES: {
    workspaceFolder: "workspaceFolder",
  },
  invalidateWorkspaceReadCaches: invalidateWorkspaceReadCachesMock,
}));

vi.mock("@/lib/file-data", () => ({
  getFolderWithAncestors: getFolderWithAncestorsMock,
  isMarkdownFileRecord: isMarkdownFileRecordMock,
  isSharedFilesVirtualFolderId: isSharedFilesVirtualFolderIdMock,
  listFolderContentsForUser: listFolderContentsForUserMock,
  listNoteContentByFileIds: listNoteContentByFileIdsMock,
  listWorkspaceMembers: listWorkspaceMembersMock,
  softDeleteFolder: softDeleteFolderMock,
  updateFolder: updateFolderMock,
  userCanEditFolder: userCanEditFolderMock,
  userCanViewFolder: userCanViewFolderMock,
}));

vi.mock("@/lib/files-realtime-publisher", () => ({
  publishFilesInvalidationEvent: publishFilesInvalidationEventMock,
}));

vi.mock("@/lib/route-cache", () => ({
  createRouteCacheKey: createRouteCacheKeyMock,
  getCachedRoute: getCachedRouteMock,
  getRouteCacheVersion: getRouteCacheVersionMock,
  setCachedRoute: setCachedRouteMock,
}));

vi.mock("@/lib/workspace", () => ({
  getSessionUser: getSessionUserMock,
}));

import { DELETE, GET, PATCH } from "./route";

const WORKSPACE_UUID = "workspace-1";
const FOLDER_UUID = "folder-1";
const FOLDER_ROUTE_URL =
  "http://localhost:3003/api/workspaces/workspace-1/folders/folder-1";
const FOLDER_ROUTE_PARAMS = {
  params: Promise.resolve({
    workspaceUuid: WORKSPACE_UUID,
    folderUuid: FOLDER_UUID,
  }),
};
const SESSION_USER = { id: "user-1" };

function folderRouteRequest(
  method: "DELETE" | "GET" | "PATCH",
  body?: Record<string, unknown>
) {
  return new Request(FOLDER_ROUTE_URL, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function mockSessionUser() {
  getSessionUserMock.mockResolvedValue(SESSION_USER);
}

async function readErrorResponse(response: Response) {
  return {
    body: await response.json(),
    status: response.status,
  };
}

function resetWorkspaceFolderRouteMocks() {
  for (const mock of [
    createRouteCacheKeyMock,
    getCachedRouteMock,
    getFolderWithAncestorsMock,
    getIngestionFlagsByFileIdsMock,
    getRouteCacheVersionMock,
    getSessionUserMock,
    invalidateWorkspaceReadCachesMock,
    isMarkdownFileRecordMock,
    isSharedFilesVirtualFolderIdMock,
    listFolderContentsForUserMock,
    listNoteContentByFileIdsMock,
    listWorkspaceMembersMock,
    publishFilesInvalidationEventMock,
    setCachedRouteMock,
    softDeleteFolderMock,
    updateFolderMock,
    userCanEditFolderMock,
    userCanViewFolderMock,
  ]) {
    mock.mockReset();
  }
}

describe("/api/workspaces/[workspaceUuid]/folders/[folderUuid] route", () => {
  beforeEach(() => {
    resetWorkspaceFolderRouteMocks();

    createRouteCacheKeyMock.mockReturnValue("cache-key-1");
    getRouteCacheVersionMock.mockResolvedValue("version-1");
    isMarkdownFileRecordMock.mockReturnValue(false);
    isSharedFilesVirtualFolderIdMock.mockReturnValue(false);
    listNoteContentByFileIdsMock.mockResolvedValue(new Map());
    getIngestionFlagsByFileIdsMock.mockResolvedValue({});
  });

  it("returns unauthorized for GET without a session user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    await expect(
      readErrorResponse(
        await GET(folderRouteRequest("GET"), FOLDER_ROUTE_PARAMS)
      )
    ).resolves.toEqual({
      body: { error: "Unauthorized" },
      status: 401,
    });
  });

  it.each([
    {
      body: undefined,
      method: "GET" as const,
    },
    {
      body: { name: "Renamed" },
      method: "PATCH" as const,
    },
    {
      body: undefined,
      method: "DELETE" as const,
    },
  ])("fails closed from $method when session lookup throws before folder route handling begins", async ({
    body,
    method,
  }) => {
    getSessionUserMock.mockRejectedValueOnce(
      new Error("folder route auth offline")
    );

    const response =
      method === "GET"
        ? await GET(folderRouteRequest("GET"), FOLDER_ROUTE_PARAMS)
        : method === "PATCH"
          ? await PATCH(folderRouteRequest("PATCH", body), FOLDER_ROUTE_PARAMS)
          : await DELETE(folderRouteRequest("DELETE"), FOLDER_ROUTE_PARAMS);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "folder route auth offline",
    });
    expect(userCanViewFolderMock).not.toHaveBeenCalled();
    expect(userCanEditFolderMock).not.toHaveBeenCalled();
    expect(getRouteCacheVersionMock).not.toHaveBeenCalled();
    expect(listWorkspaceMembersMock).not.toHaveBeenCalled();
    expect(updateFolderMock).not.toHaveBeenCalled();
    expect(softDeleteFolderMock).not.toHaveBeenCalled();
  });

  it("fails closed for GET when folder view preflight throws before folder loading begins", async () => {
    mockSessionUser();
    userCanViewFolderMock.mockRejectedValueOnce(
      new Error("folder view gate offline")
    );

    const response = await GET(folderRouteRequest("GET"), FOLDER_ROUTE_PARAMS);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "folder view gate offline",
    });
    expect(getRouteCacheVersionMock).not.toHaveBeenCalled();
    expect(getFolderWithAncestorsMock).not.toHaveBeenCalled();
    expect(listFolderContentsForUserMock).not.toHaveBeenCalled();
  });

  it("returns cached GET payloads without loading folder data again", async () => {
    mockSessionUser();
    userCanViewFolderMock.mockResolvedValue(true);
    getCachedRouteMock.mockResolvedValue({
      folder: { id: FOLDER_UUID },
      ancestors: [],
      folders: [],
      files: [],
    });

    const response = await GET(folderRouteRequest("GET"), FOLDER_ROUTE_PARAMS);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-workspace-folder-cache")).toBe("hit");
    await expect(response.json()).resolves.toEqual({
      folder: { id: FOLDER_UUID },
      ancestors: [],
      folders: [],
      files: [],
    });
    expect(getFolderWithAncestorsMock).not.toHaveBeenCalled();
    expect(listFolderContentsForUserMock).not.toHaveBeenCalled();
  });

  it("returns folder not found on GET cache misses when the folder lookup fails", async () => {
    mockSessionUser();
    userCanViewFolderMock.mockResolvedValue(true);
    getCachedRouteMock.mockResolvedValue(null);
    getFolderWithAncestorsMock.mockResolvedValue(null);
    listFolderContentsForUserMock.mockResolvedValue({
      folders: [],
      files: [],
    });

    await expect(
      readErrorResponse(
        await GET(folderRouteRequest("GET"), FOLDER_ROUTE_PARAMS)
      )
    ).resolves.toEqual({
      body: { error: "Folder not found" },
      status: 404,
    });
  });

  it("returns a 500 json error on GET when folder hydration throws before ingestion lookup", async () => {
    mockSessionUser();
    userCanViewFolderMock.mockResolvedValue(true);
    getCachedRouteMock.mockResolvedValue(null);
    getFolderWithAncestorsMock.mockRejectedValueOnce(
      new Error("folder load offline")
    );
    listFolderContentsForUserMock.mockResolvedValue({
      folders: [],
      files: [],
    });

    const response = await GET(folderRouteRequest("GET"), FOLDER_ROUTE_PARAMS);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "folder load offline",
    });
    expect(getIngestionFlagsByFileIdsMock).not.toHaveBeenCalled();
    expect(setCachedRouteMock).not.toHaveBeenCalled();
  });

  it.each([
    {
      error: "Read-only folder",
      name: "returns read-only folder for PATCH when the user cannot edit the folder",
      prepare: () => {
        mockSessionUser();
        userCanEditFolderMock.mockResolvedValue(false);
      },
      status: 403,
    },
    {
      error: "Forbidden",
      name: "returns forbidden for PATCH when the current member is not owner or admin",
      prepare: () => {
        mockSessionUser();
        userCanEditFolderMock.mockResolvedValue(true);
        listWorkspaceMembersMock.mockResolvedValue([
          {
            userId: "user-1",
            role: "member",
          },
        ]);
      },
      status: 403,
    },
  ])("$name", async ({ error, prepare, status }) => {
    prepare();

    await expect(
      readErrorResponse(
        await PATCH(
          folderRouteRequest("PATCH", { name: "Renamed" }),
          FOLDER_ROUTE_PARAMS
        )
      )
    ).resolves.toEqual({
      body: { error },
      status,
    });
  });

  it.each([
    {
      method: "PATCH" as const,
    },
    {
      method: "DELETE" as const,
    },
  ])("fails closed from $method when folder edit preflight throws before mutation handling begins", async ({
    method,
  }) => {
    mockSessionUser();
    userCanEditFolderMock.mockRejectedValueOnce(
      new Error("folder edit gate offline")
    );

    const response =
      method === "PATCH"
        ? await PATCH(
            folderRouteRequest("PATCH", { name: "Renamed" }),
            FOLDER_ROUTE_PARAMS
          )
        : await DELETE(folderRouteRequest("DELETE"), FOLDER_ROUTE_PARAMS);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "folder edit gate offline",
    });
    expect(listWorkspaceMembersMock).not.toHaveBeenCalled();
    expect(getFolderWithAncestorsMock).not.toHaveBeenCalled();
    expect(updateFolderMock).not.toHaveBeenCalled();
    expect(softDeleteFolderMock).not.toHaveBeenCalled();
  });

  it("updates folders, invalidates both affected parents, and clears read caches", async () => {
    mockSessionUser();
    userCanEditFolderMock.mockResolvedValue(true);
    listWorkspaceMembersMock.mockResolvedValue([
      {
        userId: "user-1",
        role: "owner",
      },
    ]);
    getFolderWithAncestorsMock.mockResolvedValue({
      folder: { id: FOLDER_UUID, parentId: "parent-old" },
      ancestors: [],
    });
    updateFolderMock.mockResolvedValue({
      id: FOLDER_UUID,
      parentId: "parent-new",
      name: "Renamed",
    });

    const response = await PATCH(
      folderRouteRequest("PATCH", { name: "Renamed", parentId: "parent-new" }),
      FOLDER_ROUTE_PARAMS
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      folder: {
        id: FOLDER_UUID,
        parentId: "parent-new",
        name: "Renamed",
      },
    });
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(1, {
      workspaceUuid: WORKSPACE_UUID,
      folderId: FOLDER_UUID,
      reason: "folder.updated",
    });
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(2, {
      workspaceUuid: WORKSPACE_UUID,
      folderId: "parent-old",
      reason: "tree.changed",
    });
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(3, {
      workspaceUuid: WORKSPACE_UUID,
      folderId: "parent-new",
      reason: "tree.changed",
    });
    expect(invalidateWorkspaceReadCachesMock).toHaveBeenCalledWith(
      WORKSPACE_UUID
    );
  });

  it("returns a 500 json error for PATCH when folder persistence throws before invalidation", async () => {
    mockSessionUser();
    userCanEditFolderMock.mockResolvedValue(true);
    listWorkspaceMembersMock.mockResolvedValue([
      {
        userId: "user-1",
        role: "owner",
      },
    ]);
    getFolderWithAncestorsMock.mockResolvedValue({
      folder: { id: FOLDER_UUID, parentId: "parent-old" },
      ancestors: [],
    });
    updateFolderMock.mockRejectedValueOnce(new Error("folder update offline"));

    const response = await PATCH(
      folderRouteRequest("PATCH", { name: "Renamed" }),
      FOLDER_ROUTE_PARAMS
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "folder update offline",
    });
    expect(publishFilesInvalidationEventMock).not.toHaveBeenCalled();
    expect(invalidateWorkspaceReadCachesMock).not.toHaveBeenCalled();
  });

  it("blocks deleting the shared virtual folder", async () => {
    mockSessionUser();
    userCanEditFolderMock.mockResolvedValue(true);
    isSharedFilesVirtualFolderIdMock.mockReturnValue(true);

    await expect(
      readErrorResponse(
        await DELETE(folderRouteRequest("DELETE"), FOLDER_ROUTE_PARAMS)
      )
    ).resolves.toEqual({
      body: { error: "Shared Files is read-only" },
      status: 400,
    });
  });

  it("soft deletes folders and publishes tree invalidation for successful deletes", async () => {
    mockSessionUser();
    userCanEditFolderMock.mockResolvedValue(true);
    listWorkspaceMembersMock.mockResolvedValue([
      {
        userId: "user-1",
        role: "admin",
      },
    ]);
    softDeleteFolderMock.mockResolvedValue(true);

    const response = await DELETE(
      folderRouteRequest("DELETE"),
      FOLDER_ROUTE_PARAMS
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(1, {
      workspaceUuid: WORKSPACE_UUID,
      folderId: FOLDER_UUID,
      reason: "folder.deleted",
    });
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(2, {
      workspaceUuid: WORKSPACE_UUID,
      reason: "tree.changed",
    });
    expect(invalidateWorkspaceReadCachesMock).toHaveBeenCalledWith(
      WORKSPACE_UUID
    );
  });

  it("returns a 500 json error for DELETE when folder deletion throws before invalidation", async () => {
    mockSessionUser();
    userCanEditFolderMock.mockResolvedValue(true);
    listWorkspaceMembersMock.mockResolvedValue([
      {
        userId: "user-1",
        role: "admin",
      },
    ]);
    softDeleteFolderMock.mockRejectedValueOnce(
      new Error("folder delete offline")
    );

    const response = await DELETE(
      folderRouteRequest("DELETE"),
      FOLDER_ROUTE_PARAMS
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "folder delete offline",
    });
    expect(publishFilesInvalidationEventMock).not.toHaveBeenCalled();
    expect(invalidateWorkspaceReadCachesMock).not.toHaveBeenCalled();
  });
});
