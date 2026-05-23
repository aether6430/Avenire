import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  importGoogleDriveFiles,
  importNotionPages,
  loadDataImportFolders,
  loadDataImportsOverview,
  loadGooglePickerToken,
  saveDataImportDestination,
} from "@/components/settings/data-imports-client";

describe("data imports client", () => {
  const dataImportsClientSource = readFileSync(
    resolve(import.meta.dirname, "./data-imports-client.ts"),
    "utf8"
  );

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads overview and destination folders through the imports transport routes", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            destination: null,
            providers: {
              google: {
                accountId: null,
                configured: true,
                connected: false,
                hasRefreshToken: false,
                hasUsableAccessToken: false,
                ready: false,
                scopes: [],
              },
              notion: {
                accountId: null,
                configured: true,
                connected: false,
                hasRefreshToken: false,
                hasUsableAccessToken: false,
                ready: false,
                scopes: [],
              },
            },
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            folders: [
              {
                id: "folder-1",
                name: "Inbox",
                parentId: null,
                readOnly: false,
              },
            ],
            rootFolderId: "folder-1",
          }),
          { status: 200 }
        )
      );

    await expect(loadDataImportsOverview()).resolves.toMatchObject({
      destination: null,
      providers: {
        google: expect.any(Object),
        notion: expect.any(Object),
      },
    });

    await expect(loadDataImportFolders("workspace-1")).resolves.toEqual({
      folders: [
        {
          id: "folder-1",
          name: "Inbox",
          parentId: null,
          readOnly: false,
        },
      ],
      rootFolderId: "folder-1",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/imports/providers", {
      cache: "no-store",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/imports/destination/folders?workspaceId=workspace-1",
      {
        cache: "no-store",
      }
    );
  });

  it("persists destination and executes notion/google imports through their dedicated endpoints", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            destination: {
              createdAt: "2026-05-13T10:00:00.000Z",
              folderId: "folder-1",
              folderName: "Inbox",
              id: "destination-1",
              label: "Inbox",
              organizationId: "org-1",
              updatedAt: "2026-05-13T10:00:00.000Z",
              workspaceId: "workspace-1",
              workspaceName: "Workspace",
            },
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ imported: [{ fileId: "note-1" }] }), {
          status: 200,
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: "token-123" }), {
          status: 200,
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ imported: [{ fileId: "drive-1" }] }), {
          status: 200,
        })
      );

    await expect(
      saveDataImportDestination({
        folderId: "folder-1",
        workspaceId: "workspace-1",
      })
    ).resolves.toMatchObject({
      folderId: "folder-1",
      workspaceId: "workspace-1",
    });

    await expect(importNotionPages(["page-1"])).resolves.toEqual([
      { fileId: "note-1" },
    ]);
    await expect(loadGooglePickerToken()).resolves.toBe("token-123");
    await expect(importGoogleDriveFiles(["drive-file-1"])).resolves.toEqual([
      { fileId: "drive-1" },
    ]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/imports/destination",
      expect.objectContaining({
        body: JSON.stringify({
          folderId: "folder-1",
          workspaceId: "workspace-1",
        }),
        method: "PUT",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/imports/notion/import",
      expect.objectContaining({
        body: JSON.stringify({ pageIds: ["page-1"] }),
        method: "POST",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/imports/google-drive/picker-token",
      {
        cache: "no-store",
      }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/imports/google-drive/import",
      expect.objectContaining({
        body: JSON.stringify({ fileIds: ["drive-file-1"] }),
        method: "POST",
      })
    );
    expect(dataImportsClientSource).toContain('"/api/imports/providers"');
    expect(dataImportsClientSource).toContain('"/api/imports/destination"');
    expect(dataImportsClientSource).toContain('"/api/imports/notion/pages"');
    expect(dataImportsClientSource).toContain('"/api/imports/notion/import"');
    expect(dataImportsClientSource).toContain(
      '"/api/imports/google-drive/picker-token"'
    );
    expect(dataImportsClientSource).toContain(
      '"/api/imports/google-drive/import"'
    );
    expect(dataImportsClientSource).not.toContain("linkSocial(");
    expect(dataImportsClientSource).not.toContain(
      "selectGoogleDriveImportFileIds"
    );
    expect(dataImportsClientSource).not.toContain("getDataImportsCallbackUrl");
  });
});
