import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  deleteIngestionDataForFileMock,
  ensureWorkspaceAccessForUserMock,
  getFileAssetByIdMock,
  getSessionUserMock,
  invalidateWorkspaceReadCachesMock,
  isSharedFilesVirtualFolderIdMock,
  publishFilesInvalidationEventMock,
  softDeleteFileAssetMock,
  updateFileAssetMock,
  userCanEditFileMock,
} = vi.hoisted(() => ({
  deleteIngestionDataForFileMock: vi.fn(),
  ensureWorkspaceAccessForUserMock: vi.fn(),
  getFileAssetByIdMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  invalidateWorkspaceReadCachesMock: vi.fn(),
  isSharedFilesVirtualFolderIdMock: vi.fn(),
  publishFilesInvalidationEventMock: vi.fn(),
  softDeleteFileAssetMock: vi.fn(),
  updateFileAssetMock: vi.fn(),
  userCanEditFileMock: vi.fn(),
}));

vi.mock("@/lib/file-data", () => ({
  deleteIngestionDataForFile: deleteIngestionDataForFileMock,
  getFileAssetById: getFileAssetByIdMock,
  isSharedFilesVirtualFolderId: isSharedFilesVirtualFolderIdMock,
  softDeleteFileAsset: softDeleteFileAssetMock,
  updateFileAsset: updateFileAssetMock,
  userCanEditFile: userCanEditFileMock,
}));

vi.mock("@/lib/files-realtime-publisher", () => ({
  publishFilesInvalidationEvent: publishFilesInvalidationEventMock,
}));

vi.mock("@/lib/domain-cache", () => ({
  invalidateWorkspaceReadCaches: invalidateWorkspaceReadCachesMock,
}));

vi.mock("@/lib/workspace", () => ({
  ensureWorkspaceAccessForUser: ensureWorkspaceAccessForUserMock,
  getSessionUser: getSessionUserMock,
}));

import { DELETE, GET, PATCH } from "./route";

const WORKSPACE_UUID = "workspace-1";
const FILE_UUID = "file-1";
const FILE_ROUTE_URL =
  "http://localhost:3003/api/workspaces/workspace-1/files/file-1";
const FILE_ROUTE_PARAMS = {
  params: Promise.resolve({
    workspaceUuid: WORKSPACE_UUID,
    fileUuid: FILE_UUID,
  }),
};
const SESSION_USER = { id: "user-1" };

function routeRequest(
  method: "DELETE" | "GET" | "PATCH",
  body?: Record<string, unknown>
) {
  return new Request(FILE_ROUTE_URL, {
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

describe("/api/workspaces/[workspaceUuid]/files/[fileUuid] route", () => {
  beforeEach(() => {
    deleteIngestionDataForFileMock.mockReset();
    ensureWorkspaceAccessForUserMock.mockReset();
    getFileAssetByIdMock.mockReset();
    getSessionUserMock.mockReset();
    invalidateWorkspaceReadCachesMock.mockReset();
    isSharedFilesVirtualFolderIdMock.mockReset();
    publishFilesInvalidationEventMock.mockReset();
    softDeleteFileAssetMock.mockReset();
    updateFileAssetMock.mockReset();
    userCanEditFileMock.mockReset();

    isSharedFilesVirtualFolderIdMock.mockReturnValue(false);
    invalidateWorkspaceReadCachesMock.mockResolvedValue(undefined);
    publishFilesInvalidationEventMock.mockResolvedValue(undefined);
  });

  it("returns unauthorized from GET when there is no signed-in user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    await expect(
      readErrorResponse(await GET(routeRequest("GET"), FILE_ROUTE_PARAMS))
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
      body: { name: "renamed.md" },
      method: "PATCH" as const,
    },
    {
      body: undefined,
      method: "DELETE" as const,
    },
  ])("fails closed from $method when session lookup throws before file route handling begins", async ({
    body,
    method,
  }) => {
    getSessionUserMock.mockRejectedValueOnce(
      new Error("file route auth offline")
    );

    const response =
      method === "GET"
        ? await GET(routeRequest("GET"), FILE_ROUTE_PARAMS)
        : method === "PATCH"
          ? await PATCH(routeRequest("PATCH", body), FILE_ROUTE_PARAMS)
          : await DELETE(routeRequest("DELETE"), FILE_ROUTE_PARAMS);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "file route auth offline",
    });
    expect(ensureWorkspaceAccessForUserMock).not.toHaveBeenCalled();
    expect(userCanEditFileMock).not.toHaveBeenCalled();
    expect(getFileAssetByIdMock).not.toHaveBeenCalled();
  });

  it("returns forbidden from GET when the user cannot access the workspace", async () => {
    mockSessionUser();
    ensureWorkspaceAccessForUserMock.mockResolvedValue(false);

    await expect(
      readErrorResponse(await GET(routeRequest("GET"), FILE_ROUTE_PARAMS))
    ).resolves.toEqual({
      body: { error: "Forbidden" },
      status: 403,
    });
  });

  it("returns a stable file summary from GET", async () => {
    mockSessionUser();
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockResolvedValue({
      id: FILE_UUID,
      folderId: "folder-1",
      mimeType: "text/markdown",
      name: "notes.md",
    });

    const response = await GET(routeRequest("GET"), FILE_ROUTE_PARAMS);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      file: {
        id: FILE_UUID,
        folderId: "folder-1",
        mimeType: "text/markdown",
        name: "notes.md",
      },
    });
  });

  it("returns a 500 json error from GET when file lookup throws after access succeeds", async () => {
    mockSessionUser();
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockRejectedValueOnce(
      new Error("file lookup offline")
    );

    const response = await GET(routeRequest("GET"), FILE_ROUTE_PARAMS);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "file lookup offline",
    });
  });

  it.each([
    {
      body: { name: "new-name.md" },
      error: "Read-only file",
      name: "returns read-only file from PATCH when the user cannot edit it",
      prepare: () => {
        mockSessionUser();
        userCanEditFileMock.mockResolvedValue(false);
      },
      status: 403,
    },
    {
      body: { folderId: "shared-folder" },
      error: "Cannot move items into Shared Files",
      name: "blocks moves into Shared Files from PATCH",
      prepare: () => {
        mockSessionUser();
        userCanEditFileMock.mockResolvedValue(true);
        isSharedFilesVirtualFolderIdMock.mockReturnValue(true);
      },
      status: 400,
    },
  ])("$name", async ({ body, error, prepare, status }) => {
    prepare();

    await expect(
      readErrorResponse(
        await PATCH(routeRequest("PATCH", body), FILE_ROUTE_PARAMS)
      )
    ).resolves.toEqual({
      body: { error },
      status,
    });
  });

  it("updates file metadata and publishes invalidation events from PATCH", async () => {
    mockSessionUser();
    userCanEditFileMock.mockResolvedValue(true);
    updateFileAssetMock.mockResolvedValue({
      id: FILE_UUID,
      folderId: "folder-2",
      name: "renamed.md",
    });

    const response = await PATCH(
      routeRequest("PATCH", {
        name: "renamed.md",
        folderId: "folder-2",
        metadata: {
          extra: true,
        },
        page: {
          icon: "spark",
          properties: {
            Difficulty: {
              type: "text",
              value: "hard",
            },
          },
        },
      }),
      FILE_ROUTE_PARAMS
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      file: {
        id: FILE_UUID,
        folderId: "folder-2",
        name: "renamed.md",
      },
    });
    expect(updateFileAssetMock).toHaveBeenCalledWith(
      WORKSPACE_UUID,
      FILE_UUID,
      "user-1",
      {
        folderId: "folder-2",
        metadata: {
          extra: true,
          page: {
            bannerUrl: null,
            icon: "spark",
            properties: {
              difficulty: {
                type: "text",
                value: "hard",
              },
            },
          },
        },
        name: "renamed.md",
      }
    );
    expect(invalidateWorkspaceReadCachesMock).toHaveBeenCalledWith(
      WORKSPACE_UUID
    );
    expect(publishFilesInvalidationEventMock).toHaveBeenCalledTimes(2);
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(1, {
      workspaceUuid: WORKSPACE_UUID,
      folderId: "folder-2",
      reason: "file.updated",
    });
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(2, {
      workspaceUuid: WORKSPACE_UUID,
      reason: "tree.changed",
    });
  });

  it("returns a 500 json error from PATCH when file persistence throws before invalidation work", async () => {
    mockSessionUser();
    userCanEditFileMock.mockResolvedValue(true);
    updateFileAssetMock.mockRejectedValueOnce(new Error("file update offline"));

    const response = await PATCH(
      routeRequest("PATCH", {
        name: "renamed.md",
      }),
      FILE_ROUTE_PARAMS
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "file update offline",
    });
    expect(invalidateWorkspaceReadCachesMock).not.toHaveBeenCalled();
    expect(publishFilesInvalidationEventMock).not.toHaveBeenCalled();
  });

  it.each([
    {
      error: "Read-only file",
      name: "returns read-only file from DELETE when the user cannot edit it",
      prepare: () => {
        mockSessionUser();
        userCanEditFileMock.mockResolvedValue(false);
      },
      status: 403,
    },
    {
      error: "File not found",
      name: "returns file not found from DELETE when the file does not exist",
      prepare: () => {
        mockSessionUser();
        userCanEditFileMock.mockResolvedValue(true);
        getFileAssetByIdMock.mockResolvedValue(null);
      },
      status: 404,
    },
  ])("$name", async ({ error, prepare, status }) => {
    prepare();

    await expect(
      readErrorResponse(await DELETE(routeRequest("DELETE"), FILE_ROUTE_PARAMS))
    ).resolves.toEqual({
      body: { error },
      status,
    });
  });

  it("deletes file ingestion + file record and publishes invalidation events from DELETE", async () => {
    mockSessionUser();
    userCanEditFileMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockResolvedValue({
      id: FILE_UUID,
      folderId: "folder-1",
      name: "notes.md",
    });
    softDeleteFileAssetMock.mockResolvedValue(true);

    const response = await DELETE(routeRequest("DELETE"), FILE_ROUTE_PARAMS);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(deleteIngestionDataForFileMock).toHaveBeenCalledWith(
      WORKSPACE_UUID,
      FILE_UUID
    );
    expect(softDeleteFileAssetMock).toHaveBeenCalledWith(
      WORKSPACE_UUID,
      FILE_UUID
    );
    expect(invalidateWorkspaceReadCachesMock).toHaveBeenCalledWith(
      WORKSPACE_UUID
    );
    expect(publishFilesInvalidationEventMock).toHaveBeenCalledTimes(2);
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(1, {
      workspaceUuid: WORKSPACE_UUID,
      folderId: "folder-1",
      reason: "file.deleted",
    });
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(2, {
      workspaceUuid: WORKSPACE_UUID,
      reason: "tree.changed",
    });
  });

  it("returns a 500 json error from DELETE when deletion side effects throw before success", async () => {
    mockSessionUser();
    userCanEditFileMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockResolvedValue({
      id: FILE_UUID,
      folderId: "folder-1",
      name: "notes.md",
    });
    deleteIngestionDataForFileMock.mockRejectedValueOnce(
      new Error("delete pipeline offline")
    );

    const response = await DELETE(routeRequest("DELETE"), FILE_ROUTE_PARAMS);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "delete pipeline offline",
    });
    expect(softDeleteFileAssetMock).not.toHaveBeenCalled();
    expect(invalidateWorkspaceReadCachesMock).not.toHaveBeenCalled();
    expect(publishFilesInvalidationEventMock).not.toHaveBeenCalled();
  });
});
