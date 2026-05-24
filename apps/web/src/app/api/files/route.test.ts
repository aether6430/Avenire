import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authGetSessionMock,
  getStorageUrlMock,
  headersMock,
  listWorkspaceFilesMock,
  resolveWorkspaceForUserMock,
} = vi.hoisted(() => ({
  authGetSessionMock: vi.fn(),
  getStorageUrlMock: vi.fn(),
  headersMock: vi.fn(),
  listWorkspaceFilesMock: vi.fn(),
  resolveWorkspaceForUserMock: vi.fn(),
}));

vi.mock("@avenire/auth/server", () => ({
  auth: {
    api: {
      getSession: authGetSessionMock,
    },
  },
}));

vi.mock("@avenire/storage", () => ({
  getStorageUrl: getStorageUrlMock,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/file-data", () => ({
  listWorkspaceFiles: listWorkspaceFilesMock,
  resolveWorkspaceForUser: resolveWorkspaceForUserMock,
}));

const filesRouteSource = readFileSync(
  resolve(import.meta.dirname, "route.ts"),
  "utf8"
);
const filesRouteGetSource = readFileSync(
  resolve(import.meta.dirname, "files-route-get.ts"),
  "utf8"
);
const filesRouteModelSource = readFileSync(
  resolve(import.meta.dirname, "files-route-model.ts"),
  "utf8"
);

import { GET } from "./route";

function clearEnvVar(name: string) {
  Reflect.deleteProperty(process.env, name);
}

describe("/api/files route", () => {
  const originalUploadThingToken = process.env.UPLOADTHING_TOKEN;

  beforeEach(() => {
    authGetSessionMock.mockReset();
    getStorageUrlMock.mockReset();
    headersMock.mockReset();
    listWorkspaceFilesMock.mockReset();
    resolveWorkspaceForUserMock.mockReset();

    headersMock.mockResolvedValue(new Headers());
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
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("fails closed when session lookup throws before file loading begins", async () => {
    authGetSessionMock.mockRejectedValue(new Error("session offline"));

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "session offline",
      files: [],
    });
    expect(resolveWorkspaceForUserMock).not.toHaveBeenCalled();
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
    expect(getStorageUrlMock).not.toHaveBeenCalled();
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
    getStorageUrlMock.mockImplementation(async (key: string) =>
      key === "file-1" ? "https://files.example/1" : "https://files.example/2"
    );

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
    expect(getStorageUrlMock).toHaveBeenCalledWith("file-1");
    expect(getStorageUrlMock).toHaveBeenCalledWith("file-2");
  });

  it("fails soft with an empty file list when storage url hydration throws", async () => {
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
    getStorageUrlMock.mockRejectedValue(new Error("boom"));

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ files: [] });
  });

  it("fails closed with an explicit load error when file queries throw", async () => {
    authGetSessionMock.mockResolvedValue({
      session: { activeOrganizationId: "org-1" },
      user: { id: "user-1" },
    });
    process.env.UPLOADTHING_TOKEN = "ut-token";
    resolveWorkspaceForUserMock.mockRejectedValue(new Error("files offline"));

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "files offline",
      files: [],
    });
    expect(listWorkspaceFilesMock).not.toHaveBeenCalled();
  });

  it("keeps the files route wrapper aligned to its dedicated loading handler boundary", () => {
    expect(filesRouteSource).toContain("./files-route-get");
    expect(filesRouteSource).toContain("./files-route-model");
    expect(filesRouteSource).toContain("return await handleFilesRouteGet");
    expect(filesRouteSource).not.toContain("getStorageUrl(");
    expect(filesRouteSource).not.toContain("listWorkspaceFiles(");
    expect(filesRouteSource).not.toContain("resolveWorkspaceForUser(");

    expect(filesRouteGetSource).toContain("getStorageUrl");
    expect(filesRouteGetSource).toContain("listWorkspaceFiles");
    expect(filesRouteGetSource).toContain("resolveWorkspaceForUser");
    expect(filesRouteModelSource).toContain(
      "inferUploadThingServerFileContentType"
    );
    expect(filesRouteModelSource).toContain("mapWorkspaceFileToServerFile");
  });
});
