import { describe, expect, it } from "vitest";
import {
  buildImportDestinationSummaryLabel,
  buildImportFolderOptions,
  formatImportTimestamp,
  getDataImportFolderStateLabel,
  getGoogleImportBlockedReason,
  getImportProviderStateLabel,
  resolveImportDestinationWorkspaceId,
  resolveNextImportFolderId,
} from "@/components/settings/data-imports-model";

describe("data imports model", () => {
  it("builds stable nested folder paths and sorts them by visible path", () => {
    const options = buildImportFolderOptions("root", [
      { id: "project", name: "Project", parentId: "root", readOnly: false },
      { id: "notes", name: "Notes", parentId: "project", readOnly: false },
      { id: "root", name: "Workspace", parentId: null, readOnly: false },
      { id: "archive", name: "Archive", parentId: "root", readOnly: true },
    ]);

    expect(options.map((entry) => entry.path)).toEqual([
      "Workspace",
      "Workspace / Archive",
      "Workspace / Project",
      "Workspace / Project / Notes",
    ]);
    expect(options.find((entry) => entry.id === "notes")).toMatchObject({
      path: "Workspace / Project / Notes",
      readOnly: false,
    });
  });

  it("derives provider labels and google import blocking reasons from runtime state", () => {
    expect(getImportProviderStateLabel(null)).toBe("Not linked");
    expect(
      getImportProviderStateLabel({
        accountId: "user@example.com",
        configured: true,
        connected: true,
        hasRefreshToken: true,
        hasUsableAccessToken: false,
        ready: false,
        scopes: [],
      })
    ).toBe("Reconnect required");

    expect(
      getGoogleImportBlockedReason({
        driveImporting: false,
        hasSelectedDestination: false,
        pickerApiKey: "picker-key",
        status: {
          accountId: "user@example.com",
          configured: true,
          connected: true,
          hasRefreshToken: true,
          hasUsableAccessToken: true,
          ready: true,
          scopes: [],
        },
      })
    ).toBe("Choose a destination folder first.");

    expect(
      getGoogleImportBlockedReason({
        driveImporting: false,
        hasSelectedDestination: true,
        pickerApiKey: "picker-key",
        status: {
          accountId: "user@example.com",
          configured: true,
          connected: true,
          hasRefreshToken: true,
          hasUsableAccessToken: true,
          ready: true,
          scopes: [],
        },
      })
    ).toBeNull();
  });

  it("keeps invalid import timestamps readable instead of crashing formatting", () => {
    expect(formatImportTimestamp("not-a-date")).toBe("not-a-date");
  });

  it("distinguishes folder loading, failure, and empty destination states", () => {
    expect(
      getDataImportFolderStateLabel({
        destination: null,
        destinationSummaryLabel: "Workspace / Inbox",
        folderLoadFailed: false,
        folderLoading: true,
        hasSelectedDestination: false,
      })
    ).toBe("Loading folders...");

    expect(
      getDataImportFolderStateLabel({
        destination: null,
        destinationSummaryLabel: "Workspace / Inbox",
        folderLoadFailed: true,
        folderLoading: false,
        hasSelectedDestination: false,
      })
    ).toBe("Unable to load folders.");

    expect(
      getDataImportFolderStateLabel({
        destination: null,
        destinationSummaryLabel: "Workspace / Inbox",
        folderLoadFailed: false,
        folderLoading: false,
        hasSelectedDestination: true,
      })
    ).toBe("Will save on import");
  });

  it("keeps destination workspace, folder selection, and summary fallback rules explicit", () => {
    expect(
      resolveImportDestinationWorkspaceId({
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
      })
    ).toBe("workspace-2");
    expect(
      resolveImportDestinationWorkspaceId({
        destination: null,
        fallbackWorkspaceId: "workspace-1",
      })
    ).toBe("workspace-1");

    expect(
      resolveNextImportFolderId({
        currentFolderId: "notes",
        options: [
          {
            id: "root",
            name: "Workspace",
            parentId: null,
            path: "Workspace",
            readOnly: false,
          },
          {
            id: "notes",
            name: "Notes",
            parentId: "root",
            path: "Workspace / Notes",
            readOnly: false,
          },
        ],
      })
    ).toBe("notes");
    expect(
      resolveNextImportFolderId({
        currentFolderId: "missing",
        options: [
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
      })
    ).toBe("inbox");

    expect(
      buildImportDestinationSummaryLabel({
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
        selectedFolder: null,
        selectedWorkspace: null,
      })
    ).toBe("Workspace Two / Inbox");
  });
});
