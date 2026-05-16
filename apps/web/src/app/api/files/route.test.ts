import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authGetSessionMock,
  getFileUrlsMock,
  headersMock,
  listWorkspaceFilesMock,
  resolveWorkspaceForUserMock,
  utApiMock,
} = vi.hoisted(() => ({
  authGetSessionMock: vi.fn(),
  getFileUrlsMock: vi.fn(),
  headersMock: vi.fn(),
  listWorkspaceFilesMock: vi.fn(),
  resolveWorkspaceForUserMock: vi.fn(),
  utApiMock: vi.fn(),
}));

vi.mock("@avenire/auth/server", () => ({
  auth: {
    api: {
      getSession: authGetSessionMock,
    },
  },
}));

vi.mock("@avenire/storage", () => ({
  UTApi: utApiMock,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/file-data", () => ({
  listWorkspaceFiles: listWorkspaceFilesMock,
  resolveWorkspaceForUser: resolveWorkspaceForUserMock,
}));

import { GET } from "./route";

function clearEnvVar(name: string) {
  Reflect.deleteProperty(process.env, name);
}

describe("/api/files route", () => {
  const originalUploadThingToken = process.env.UPLOADTHING_TOKEN;

  beforeEach(() => {
    authGetSessionMock.mockReset();
    getFileUrlsMock.mockReset();
    headersMock.mockReset();
    listWorkspaceFilesMock.mockReset();
    resolveWorkspaceForUserMock.mockReset();
    utApiMock.mockReset();

    headersMock.mockResolvedValue(new Headers());
    utApiMock.mockImplementation(function UTApi() {
      return {
        getFileUrls: getFileUrlsMock,
      };
    });
    if (originalUploadThingToken === undefined) {
      clearEnvVar("UPLOADTHING_TOKEN");
    } else {
      process.env.UPLOADTHING_TOKEN = originalUploadThingToken;
    }
  });

  it("returns unauthorized without a session user", async () => {
    authGetSessionMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ files: [] });
  });

  it("returns an empty list when UploadThing is not configured", async () => {
    authGetSessionMock.mockResolvedValue({
      session: { activeOrganizationId: "org-1" },
      user: { id: "user-1" },
    });
    clearEnvVar("UPLOADTHING_TOKEN");

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ files: [] });
  });

  it("returns not found when no workspace is available", async () => {
    authGetSessionMock.mockResolvedValue({
      session: { activeOrganizationId: "org-1" },
      user: { id: "user-1" },
    });
    process.env.UPLOADTHING_TOKEN = "ut-token";
    resolveWorkspaceForUserMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ files: [] });
  });

  it("returns an empty list when the workspace has no files", async () => {
    authGetSessionMock.mockResolvedValue({
      session: { activeOrganizationId: "org-1" },
      user: { id: "user-1" },
    });
    process.env.UPLOADTHING_TOKEN = "ut-token";
    resolveWorkspaceForUserMock.mockResolvedValue({
      workspaceId: "workspace-1",
    });
    listWorkspaceFilesMock.mockResolvedValue([]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ files: [] });
    expect(getFileUrlsMock).not.toHaveBeenCalled();
  });

  it("hydrates and sorts workspace files with UploadThing urls", async () => {
    authGetSessionMock.mockResolvedValue({
      session: { activeOrganizationId: "org-1" },
      user: { id: "user-1" },
    });
    process.env.UPLOADTHING_TOKEN = "ut-token";
    resolveWorkspaceForUserMock.mockResolvedValue({
      workspaceId: "workspace-1",
    });
    listWorkspaceFilesMock.mockResolvedValue([
      {
        createdAt: "2026-05-13T09:00:00.000Z",
        mimeType: null,
        name: "older.md",
        sizeBytes: 100,
        storageKey: "file-1",
      },
      {
        createdAt: "2026-05-13T10:00:00.000Z",
        mimeType: "image/png",
        name: "newer.png",
        sizeBytes: 200,
        storageKey: "file-2",
      },
    ]);
    getFileUrlsMock.mockResolvedValue({
      data: [
        { key: "file-1", url: "https://files.example/1" },
        { key: "file-2", url: "https://files.example/2" },
      ],
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      files: [
        {
          contentType: "image/png",
          key: "file-2",
          name: "newer.png",
          size: 200,
          uploadedAt: Date.parse("2026-05-13T10:00:00.000Z"),
          url: "https://files.example/2",
        },
        {
          contentType: "text/plain",
          key: "file-1",
          name: "older.md",
          size: 100,
          uploadedAt: Date.parse("2026-05-13T09:00:00.000Z"),
          url: "https://files.example/1",
        },
      ],
    });
    expect(getFileUrlsMock).toHaveBeenCalledWith(["file-1", "file-2"]);
  });

  it("returns a stable 500 response when UploadThing hydration throws", async () => {
    authGetSessionMock.mockResolvedValue({
      session: { activeOrganizationId: "org-1" },
      user: { id: "user-1" },
    });
    process.env.UPLOADTHING_TOKEN = "ut-token";
    resolveWorkspaceForUserMock.mockResolvedValue({
      workspaceId: "workspace-1",
    });
    listWorkspaceFilesMock.mockResolvedValue([
      {
        createdAt: "2026-05-13T09:00:00.000Z",
        mimeType: null,
        name: "older.md",
        sizeBytes: 100,
        storageKey: "file-1",
      },
    ]);
    getFileUrlsMock.mockRejectedValue(new Error("boom"));

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ files: [] });
  });
});
