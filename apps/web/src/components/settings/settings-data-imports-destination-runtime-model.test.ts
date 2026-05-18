import { describe, expect, it } from "vitest";
import {
  createDataImportFoldersLoadFailureState,
  createDataImportFoldersLoadStartState,
  createDataImportFoldersLoadSuccessState,
  createDataImportFoldersResetState,
  createDataImportsOverviewLoadStartState,
  createDataImportsOverviewLoadSuccessState,
  resolveDataImportsOverviewFailureStatus,
  shouldLoadDestinationFolders,
  shouldReuseSavedImportDestination,
} from "@/components/settings/settings-data-imports-destination-runtime-model";

describe("settings data imports destination runtime model", () => {
  it("creates overview load start/success/failure states", () => {
    expect(createDataImportsOverviewLoadStartState()).toEqual({
      overviewLoading: true,
      overviewStatus: null,
    });
    expect(
      createDataImportsOverviewLoadSuccessState({
        destination: {
          createdAt: "",
          folderId: "folder-1",
          folderName: "Inbox",
          id: "destination-1",
          label: "Inbox",
          organizationId: "org-1",
          updatedAt: "",
          workspaceId: "workspace-2",
          workspaceName: "Workspace Two",
        },
        fallbackWorkspaceId: "workspace-1",
        googleStatus: { ready: true } as never,
        notionStatus: { ready: false } as never,
      })
    ).toEqual({
      destination: expect.objectContaining({
        folderId: "folder-1",
        workspaceId: "workspace-2",
      }),
      destinationFolderId: "folder-1",
      destinationWorkspaceId: "workspace-2",
      googleStatus: { ready: true },
      notionStatus: { ready: false },
      overviewLoading: false,
    });
    expect(resolveDataImportsOverviewFailureStatus(new Error("offline"))).toBe(
      "offline"
    );
  });

  it("creates folder reset/start/success/failure states", () => {
    expect(shouldLoadDestinationFolders("workspace-1")).toBe(true);
    expect(shouldLoadDestinationFolders("")).toBe(false);
    expect(createDataImportFoldersResetState()).toEqual({
      folderLoadFailed: false,
      folderOptions: [],
    });
    expect(createDataImportFoldersLoadStartState()).toEqual({
      folderLoadFailed: false,
      folderLoading: true,
    });
    expect(
      createDataImportFoldersLoadSuccessState({
        currentFolderId: "missing",
        folders: [
          { id: "root", name: "Workspace", parentId: null, readOnly: true },
          { id: "inbox", name: "Inbox", parentId: "root", readOnly: false },
        ],
        rootFolderId: "root",
      })
    ).toEqual({
      destinationFolderId: "inbox",
      folderLoadFailed: false,
      folderLoading: false,
      folderOptions: [
        {
          id: "root",
          name: "Workspace",
          parentId: null,
          path: "Workspace",
          readOnly: true,
        },
        {
          id: "inbox",
          name: "Inbox",
          parentId: "root",
          path: "Workspace / Inbox",
          readOnly: false,
        },
      ],
    });
    expect(
      createDataImportFoldersLoadFailureState(new Error("folders down"))
    ).toEqual({
      destinationStatus: "folders down",
      folderLoadFailed: true,
      folderLoading: false,
      folderOptions: [],
    });
  });

  it("detects when an import destination can be reused without saving again", () => {
    expect(
      shouldReuseSavedImportDestination({
        destination: {
          createdAt: "",
          folderId: "folder-1",
          folderName: "Inbox",
          id: "destination-1",
          label: "Inbox",
          organizationId: "org-1",
          updatedAt: "",
          workspaceId: "workspace-1",
          workspaceName: "Workspace",
        },
        destinationFolderId: "folder-1",
        destinationWorkspaceId: "workspace-1",
      })
    ).toBe(true);
    expect(
      shouldReuseSavedImportDestination({
        destination: null,
        destinationFolderId: "folder-1",
        destinationWorkspaceId: "workspace-1",
      })
    ).toBe(false);
  });
});
