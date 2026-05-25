import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getDataImportOverviewMock,
  getGooglePickerTokenMock,
  getSessionUserMock,
  importGoogleDriveFilesMock,
  importNotionPagesMock,
  listImportDestinationFoldersMock,
  listImportableNotionPagesMock,
  saveDataImportDestinationMock,
} = vi.hoisted(() => ({
  getDataImportOverviewMock: vi.fn(),
  getGooglePickerTokenMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  importGoogleDriveFilesMock: vi.fn(),
  importNotionPagesMock: vi.fn(),
  listImportDestinationFoldersMock: vi.fn(),
  listImportableNotionPagesMock: vi.fn(),
  saveDataImportDestinationMock: vi.fn(),
}));

vi.mock("@/lib/imports", () => ({
  getDataImportOverview: getDataImportOverviewMock,
  getGooglePickerToken: getGooglePickerTokenMock,
  importGoogleDriveFiles: importGoogleDriveFilesMock,
  importNotionPages: importNotionPagesMock,
  listImportDestinationFolders: listImportDestinationFoldersMock,
  listImportableNotionPages: listImportableNotionPagesMock,
  saveDataImportDestination: saveDataImportDestinationMock,
}));

vi.mock("@/lib/workspace", () => ({
  getSessionUser: getSessionUserMock,
}));

import { handleImportsDestinationFoldersGet } from "@/app/api/imports/destination/folders/imports-destination-folders-route-get";
import { GET as getImportsDestinationFoldersRoute } from "@/app/api/imports/destination/folders/route";
import { handleImportsDestinationGet } from "@/app/api/imports/destination/imports-destination-route-get";
import { handleImportsDestinationPut } from "@/app/api/imports/destination/imports-destination-route-put";
import {
  GET as getImportsDestinationRoute,
  PUT as putImportsDestinationRoute,
} from "@/app/api/imports/destination/route";
import { handleGoogleDriveImportRoutePost } from "@/app/api/imports/google-drive/import/imports-google-drive-import-route-post";
import { POST as postGoogleDriveImportRoute } from "@/app/api/imports/google-drive/import/route";
import { handleGoogleDrivePickerTokenRouteGet } from "@/app/api/imports/google-drive/picker-token/imports-google-drive-picker-token-route-get";
import { GET as getGoogleDrivePickerTokenRoute } from "@/app/api/imports/google-drive/picker-token/route";
import { handleNotionImportRoutePost } from "@/app/api/imports/notion/import/imports-notion-import-route-post";
import { POST as postNotionImportRoute } from "@/app/api/imports/notion/import/route";
import { handleNotionPagesRouteGet } from "@/app/api/imports/notion/pages/imports-notion-pages-route-get";
import { GET as getNotionPagesRoute } from "@/app/api/imports/notion/pages/route";
import { handleImportsProvidersGet } from "@/app/api/imports/providers/imports-providers-route-get";
import { GET as getImportsProvidersRoute } from "@/app/api/imports/providers/route";

describe("imports routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    getDataImportOverviewMock.mockResolvedValue({
      destination: null,
      providers: {
        google: { ready: true },
        notion: { ready: false },
      },
    });
    getGooglePickerTokenMock.mockResolvedValue({
      accessToken: "google-access-token",
    });
    importGoogleDriveFilesMock.mockResolvedValue({
      jobs: [{ fileId: "drive-file-1" }],
    });
    importNotionPagesMock.mockResolvedValue({
      jobs: [{ pageId: "notion-page-1" }],
    });
    listImportDestinationFoldersMock.mockResolvedValue({
      folders: [],
      rootFolderId: "550e8400-e29b-41d4-a716-446655440002",
      workspace: {
        name: "Avenire",
        organizationId: "organization-1",
        rootFolderId: "550e8400-e29b-41d4-a716-446655440002",
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
      },
    });
    listImportableNotionPagesMock.mockResolvedValue([
      {
        id: "page-1",
        lastEditedTime: "2026-05-18T00:00:00.000Z",
        title: "Linear Algebra",
        url: "https://notion.so/page-1",
      },
    ]);
    saveDataImportDestinationMock.mockResolvedValue({
      folderId: "550e8400-e29b-41d4-a716-446655440001",
      workspaceId: "550e8400-e29b-41d4-a716-446655440000",
    });
  });

  it("fails closed when top-level session lookup throws before imports handlers run", async () => {
    getSessionUserMock.mockRejectedValueOnce(new Error("imports auth offline"));

    let response = await getImportsProvidersRoute();
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "imports auth offline",
    });
    expect(getDataImportOverviewMock).not.toHaveBeenCalled();

    getSessionUserMock.mockRejectedValueOnce(
      new Error("destination auth offline")
    );
    response = await getImportsDestinationRoute();
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "destination auth offline",
    });

    getSessionUserMock.mockRejectedValueOnce(
      new Error("destination save auth offline")
    );
    response = await putImportsDestinationRoute(
      new Request("https://avenire.space/api/imports/destination", {
        body: JSON.stringify({
          folderId: "550e8400-e29b-41d4-a716-446655440001",
          workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        }),
        method: "PUT",
      })
    );
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "destination save auth offline",
    });
    expect(saveDataImportDestinationMock).not.toHaveBeenCalled();

    getSessionUserMock.mockRejectedValueOnce(new Error("folders auth offline"));
    response = await getImportsDestinationFoldersRoute(
      new Request(
        "https://avenire.space/api/imports/destination/folders?workspaceId=550e8400-e29b-41d4-a716-446655440000"
      )
    );
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "folders auth offline",
    });
    expect(listImportDestinationFoldersMock).not.toHaveBeenCalled();

    getSessionUserMock.mockRejectedValueOnce(new Error("notion auth offline"));
    response = await getNotionPagesRoute();
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "notion auth offline",
    });
    expect(listImportableNotionPagesMock).not.toHaveBeenCalled();

    getSessionUserMock.mockRejectedValueOnce(
      new Error("google import auth offline")
    );
    response = await postGoogleDriveImportRoute(
      new Request("https://avenire.space/api/imports/google-drive/import", {
        body: JSON.stringify({ fileIds: ["drive-file-1"] }),
        method: "POST",
      })
    );
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "google import auth offline",
    });
    expect(importGoogleDriveFilesMock).not.toHaveBeenCalled();

    getSessionUserMock.mockRejectedValueOnce(
      new Error("picker token auth offline")
    );
    response = await getGoogleDrivePickerTokenRoute();
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "picker token auth offline",
    });
    expect(getGooglePickerTokenMock).not.toHaveBeenCalled();

    getSessionUserMock.mockRejectedValueOnce(
      new Error("notion import auth offline")
    );
    response = await postNotionImportRoute(
      new Request("https://avenire.space/api/imports/notion/import", {
        body: JSON.stringify({ pageIds: ["page-1"] }),
        method: "POST",
      })
    );
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "notion import auth offline",
    });
    expect(importNotionPagesMock).not.toHaveBeenCalled();
  });

  it("loads import providers overview and notion pages through the shared imports runtime", async () => {
    const providers = await handleImportsProvidersGet({ userId: "user-1" });
    const notionPages = await handleNotionPagesRouteGet({ userId: "user-1" });

    expect(getDataImportOverviewMock).toHaveBeenCalledWith("user-1");
    expect(listImportableNotionPagesMock).toHaveBeenCalledWith("user-1");
    await expect(providers.json()).resolves.toEqual({
      destination: null,
      providers: {
        google: { ready: true },
        notion: { ready: false },
      },
    });
    await expect(notionPages.json()).resolves.toEqual({
      pages: [
        {
          id: "page-1",
          lastEditedTime: "2026-05-18T00:00:00.000Z",
          title: "Linear Algebra",
          url: "https://notion.so/page-1",
        },
      ],
    });
  });

  it("fails closed with explicit 500 responses when imports overview or notion page reads throw", async () => {
    getDataImportOverviewMock.mockRejectedValueOnce(
      new Error("imports offline")
    );

    let response = await handleImportsProvidersGet({ userId: "user-1" });
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "imports offline",
    });

    getDataImportOverviewMock.mockRejectedValueOnce(
      new Error("destination offline")
    );
    response = await handleImportsDestinationGet({
      userId: "user-1",
    });
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "destination offline",
    });

    listImportDestinationFoldersMock.mockRejectedValueOnce(
      new Error("folders offline")
    );
    response = await handleImportsDestinationFoldersGet({
      request: new Request(
        "https://avenire.space/api/imports/destination/folders?workspaceId=550e8400-e29b-41d4-a716-446655440000"
      ),
      userId: "user-1",
    });
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "folders offline",
    });

    listImportableNotionPagesMock.mockRejectedValueOnce(
      new Error("notion offline")
    );
    response = await handleNotionPagesRouteGet({ userId: "user-1" });
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "notion offline",
    });
  });

  it("handles google drive import, picker token, and notion import execution contracts", async () => {
    let response = await handleGoogleDriveImportRoutePost({
      request: {
        json: vi.fn().mockResolvedValue({}),
      } as never,
      userId: "user-1",
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid payload",
    });

    response = await handleGoogleDriveImportRoutePost({
      request: {
        json: vi.fn().mockResolvedValue({
          fileIds: [" drive-file-1 "],
        }),
      } as never,
      userId: "user-1",
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      jobs: [{ fileId: "drive-file-1" }],
    });
    expect(importGoogleDriveFilesMock).toHaveBeenCalledWith({
      fileIds: ["drive-file-1"],
      userId: "user-1",
    });

    importGoogleDriveFilesMock.mockRejectedValueOnce(
      new Error("google import offline")
    );
    response = await handleGoogleDriveImportRoutePost({
      request: {
        json: vi.fn().mockResolvedValue({
          fileIds: ["drive-file-1"],
        }),
      } as never,
      userId: "user-1",
    });
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "google import offline",
    });

    response = await handleGoogleDrivePickerTokenRouteGet({
      userId: "user-1",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      accessToken: "google-access-token",
    });

    getGooglePickerTokenMock.mockRejectedValueOnce(
      new Error("picker token offline")
    );
    response = await handleGoogleDrivePickerTokenRouteGet({
      userId: "user-1",
    });
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "picker token offline",
    });

    getGooglePickerTokenMock.mockRejectedValueOnce(
      new Error("google account is not connected.")
    );
    response = await handleGoogleDrivePickerTokenRouteGet({
      userId: "user-1",
    });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "google account is not connected.",
    });

    response = await handleNotionImportRoutePost({
      request: {
        json: vi.fn().mockResolvedValue({}),
      } as never,
      userId: "user-1",
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid payload",
    });

    response = await handleNotionImportRoutePost({
      request: {
        json: vi.fn().mockResolvedValue({
          pageIds: [" page-1 "],
        }),
      } as never,
      userId: "user-1",
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      jobs: [{ pageId: "notion-page-1" }],
    });
    expect(importNotionPagesMock).toHaveBeenCalledWith({
      pageIds: ["page-1"],
      userId: "user-1",
    });

    importNotionPagesMock.mockRejectedValueOnce(
      new Error("notion import offline")
    );
    response = await handleNotionImportRoutePost({
      request: {
        json: vi.fn().mockResolvedValue({
          pageIds: ["page-1"],
        }),
      } as never,
      userId: "user-1",
    });
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "notion import offline",
    });
  });

  it("validates import destination payloads before saving and persists valid ones", async () => {
    const invalid = await handleImportsDestinationPut({
      request: {
        json: vi.fn().mockResolvedValue({}),
      } as never,
      userId: "user-1",
    });
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({
      error: "Invalid payload",
    });

    const valid = await handleImportsDestinationPut({
      request: {
        json: vi.fn().mockResolvedValue({
          folderId: "550e8400-e29b-41d4-a716-446655440001",
          workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        }),
      } as never,
      userId: "user-1",
    });
    expect(saveDataImportDestinationMock).toHaveBeenCalledWith({
      folderId: "550e8400-e29b-41d4-a716-446655440001",
      userId: "user-1",
      workspaceId: "550e8400-e29b-41d4-a716-446655440000",
    });
    await expect(valid.json()).resolves.toEqual({
      destination: {
        folderId: "550e8400-e29b-41d4-a716-446655440001",
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
      },
    });

    saveDataImportDestinationMock.mockRejectedValueOnce(
      new Error("destination save offline")
    );
    const failed = await handleImportsDestinationPut({
      request: {
        json: vi.fn().mockResolvedValue({
          folderId: "550e8400-e29b-41d4-a716-446655440001",
          workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        }),
      } as never,
      userId: "user-1",
    });
    expect(failed.status).toBe(500);
    await expect(failed.json()).resolves.toEqual({
      error: "destination save offline",
    });
  });

  it("fails closed on missing or malformed workspace ids before destination folder lookup", async () => {
    let response = await handleImportsDestinationFoldersGet({
      request: new Request(
        "https://avenire.space/api/imports/destination/folders"
      ),
      userId: "user-1",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "workspaceId is required",
    });

    response = await handleImportsDestinationFoldersGet({
      request: new Request(
        "https://avenire.space/api/imports/destination/folders?workspaceId=workspace-1"
      ),
      userId: "user-1",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid workspaceId",
    });
    expect(listImportDestinationFoldersMock).not.toHaveBeenCalled();
  });
});
