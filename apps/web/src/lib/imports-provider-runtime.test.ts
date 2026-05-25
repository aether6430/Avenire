import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  createExtensionDestinationPresetMock,
  getAccessTokenMock,
  getExtensionDestinationPresetMock,
  getLatestAuthAccountForUserMock,
  listAuthAccountsForUserMock,
  listExtensionDestinationPresetsMock,
  listWorkspaceFoldersMock,
  listWorkspacesForUserMock,
  updateExtensionDestinationPresetMock,
  userCanEditFolderMock,
} = vi.hoisted(() => ({
  createExtensionDestinationPresetMock: vi.fn(),
  getAccessTokenMock: vi.fn(),
  getExtensionDestinationPresetMock: vi.fn(),
  getLatestAuthAccountForUserMock: vi.fn(),
  listAuthAccountsForUserMock: vi.fn(),
  listExtensionDestinationPresetsMock: vi.fn(),
  listWorkspaceFoldersMock: vi.fn(),
  listWorkspacesForUserMock: vi.fn(),
  updateExtensionDestinationPresetMock: vi.fn(),
  userCanEditFolderMock: vi.fn(),
}));

vi.mock("@avenire/auth/server", () => ({
  auth: {
    api: {
      getAccessToken: getAccessTokenMock,
    },
  },
}));

vi.mock("@avenire/database", () => ({
  createExtensionDestinationPreset: createExtensionDestinationPresetMock,
  getExtensionDestinationPreset: getExtensionDestinationPresetMock,
  getLatestAuthAccountForUser: getLatestAuthAccountForUserMock,
  listAuthAccountsForUser: listAuthAccountsForUserMock,
  listExtensionDestinationPresets: listExtensionDestinationPresetsMock,
  listWorkspaceFolders: listWorkspaceFoldersMock,
  listWorkspacesForUser: listWorkspacesForUserMock,
  updateExtensionDestinationPreset: updateExtensionDestinationPresetMock,
}));

vi.mock("@/lib/file-data", () => ({
  userCanEditFolder: userCanEditFolderMock,
}));

vi.mock("@/lib/imports-google-scopes", () => ({
  GOOGLE_IMPORT_SCOPES: [
    "https://www.googleapis.com/auth/drive.readonly",
    "profile",
  ],
}));

import {
  getDataImportOverview,
  getImportProviderDebugSnapshot,
  getProviderAccessToken,
  hasScopes,
  hasUsableAccessToken,
  listImportDestinationFolders,
  parseScopeList,
  requireDataImportDestination,
  saveDataImportDestination,
} from "@/lib/imports-provider-runtime";

describe("imports provider runtime", () => {
  beforeEach(() => {
    createExtensionDestinationPresetMock.mockReset();
    getAccessTokenMock.mockReset();
    getExtensionDestinationPresetMock.mockReset();
    getLatestAuthAccountForUserMock.mockReset();
    listAuthAccountsForUserMock.mockReset();
    listExtensionDestinationPresetsMock.mockReset();
    listWorkspaceFoldersMock.mockReset();
    listWorkspacesForUserMock.mockReset();
    updateExtensionDestinationPresetMock.mockReset();
    userCanEditFolderMock.mockReset();
  });

  it("parses scopes and accepts google aliases", () => {
    expect(parseScopeList("email profile custom")).toEqual([
      "email",
      "profile",
      "custom",
    ]);
    expect(
      hasScopes(
        [
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile",
        ],
        ["email", "profile"]
      )
    ).toBe(true);
  });

  it("detects whether an access token is still usable", () => {
    expect(hasUsableAccessToken(null)).toBe(false);
    expect(
      hasUsableAccessToken({
        accessToken: "token",
        accessTokenExpiresAt: null,
      } as never)
    ).toBe(true);
  });

  it("returns provider overview and auth debug snapshots", async () => {
    process.env.AUTH_GOOGLE_ID = "google-id";
    process.env.AUTH_GOOGLE_SECRET = "google-secret";
    process.env.AUTH_NOTION_ID = "notion-id";
    process.env.AUTH_NOTION_SECRET = "notion-secret";

    getLatestAuthAccountForUserMock.mockResolvedValue({
      accessToken: "stored-token",
      accessTokenExpiresAt: new Date(Date.now() + 60_000),
      accountId: "acct-1",
      createdAt: new Date("2026-05-17T00:00:00.000Z"),
      id: "rec-1",
      providerId: "google",
      refreshToken: "refresh",
      scope:
        "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile",
      updatedAt: new Date("2026-05-17T00:00:00.000Z"),
    });
    listExtensionDestinationPresetsMock.mockResolvedValue([
      {
        createdAt: new Date("2026-05-17T00:00:00.000Z"),
        folderId: "folder-1",
        folderName: "Imports",
        id: "preset-1",
        label: "Avenire Data Import",
        organizationId: "org-1",
        updatedAt: new Date("2026-05-17T00:00:00.000Z"),
        workspaceId: "workspace-1",
        workspaceName: "Workspace",
      },
    ]);
    listAuthAccountsForUserMock.mockResolvedValue([
      {
        accessToken: "stored-token",
        accessTokenExpiresAt: new Date("2026-05-17T01:00:00.000Z"),
        accountId: "acct-1",
        createdAt: new Date("2026-05-17T00:00:00.000Z"),
        id: "rec-1",
        providerId: "google",
        refreshToken: "refresh",
        scope: "https://www.googleapis.com/auth/drive.readonly",
        updatedAt: new Date("2026-05-17T00:00:00.000Z"),
      },
    ]);
    getAccessTokenMock.mockResolvedValue({
      accessToken: "fresh-token",
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });

    const overview = await getDataImportOverview("user-1");
    expect(overview.destination?.folderId).toBe("folder-1");
    expect(overview.providers.google.connected).toBe(true);

    const snapshot = await getImportProviderDebugSnapshot("user-1");
    expect(snapshot.google.tokenCheck.ok).toBe(true);
  });

  it("gets provider access tokens and enforces scope/config checks", async () => {
    process.env.AUTH_GOOGLE_ID = "google-id";
    process.env.AUTH_GOOGLE_SECRET = "google-secret";
    getLatestAuthAccountForUserMock.mockResolvedValue({
      accessToken: "stored-token",
      accessTokenExpiresAt: new Date(Date.now() + 60_000),
      accountId: "acct-1",
      createdAt: new Date(),
      id: "rec-1",
      providerId: "google",
      refreshToken: "refresh-token",
      scope:
        "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile",
      updatedAt: new Date(),
    });
    getAccessTokenMock.mockResolvedValue(undefined);

    const token = await getProviderAccessToken("user-1", "google");
    expect(token.accessToken).toBe("stored-token");
  });

  it("lists destination folders and saves/requires the import destination", async () => {
    listWorkspacesForUserMock.mockResolvedValue([
      {
        name: "Workspace",
        organizationId: "org-1",
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    ]);
    listWorkspaceFoldersMock.mockResolvedValue([
      { id: "folder-1", name: "Imports", parentId: "root-1", readOnly: false },
    ]);
    userCanEditFolderMock.mockResolvedValue(true);
    createExtensionDestinationPresetMock.mockResolvedValue({
      createdAt: new Date("2026-05-17T00:00:00.000Z"),
      folderId: "folder-1",
      folderName: "Imports",
      id: "preset-1",
      label: "Avenire Data Import",
      organizationId: "org-1",
      updatedAt: new Date("2026-05-17T00:00:00.000Z"),
      workspaceId: "workspace-1",
      workspaceName: "Workspace",
    });
    listExtensionDestinationPresetsMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "preset-1",
          label: "Avenire Data Import",
        },
      ]);
    getExtensionDestinationPresetMock.mockResolvedValue({
      folderId: "folder-1",
      id: "preset-1",
      workspaceId: "workspace-1",
    });

    const folders = await listImportDestinationFolders({
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(folders.folders).toHaveLength(1);

    const saved = await saveDataImportDestination({
      folderId: "folder-1",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(saved?.folderId).toBe("folder-1");

    const required = await requireDataImportDestination("user-1");
    expect(required.folderId).toBe("folder-1");
  });

  it("owns the data import preset label inside the provider runtime instead of a separate one-line wrapper file", async () => {
    const source = await import("@/lib/imports-provider-runtime");
    expect(source.DATA_IMPORT_PRESET_LABEL).toBe("Avenire Data Import");
  });
});
