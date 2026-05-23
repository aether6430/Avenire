import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  deleteUploadThingFileMock,
  getProviderAccessTokenMock,
  registerWorkspaceUploadedFileMock,
  requireDataImportDestinationMock,
  uploadStorageFileMock,
} = vi.hoisted(() => ({
  deleteUploadThingFileMock: vi.fn(),
  getProviderAccessTokenMock: vi.fn(),
  registerWorkspaceUploadedFileMock: vi.fn(),
  requireDataImportDestinationMock: vi.fn(),
  uploadStorageFileMock: vi.fn(),
}));

vi.mock("@avenire/storage", () => ({
  uploadStorageFile: uploadStorageFileMock,
}));

vi.mock("@/lib/imports-provider-runtime", () => ({
  getProviderAccessToken: getProviderAccessTokenMock,
  requireDataImportDestination: requireDataImportDestinationMock,
  serializeDestination: (
    value: {
      createdAt?: Date;
      updatedAt?: Date;
    } | null
  ) =>
    value
      ? {
          ...value,
          createdAt: value.createdAt?.toISOString?.() ?? null,
          updatedAt: value.updatedAt?.toISOString?.() ?? null,
        }
      : null,
}));

vi.mock("@/lib/upload-registration", () => ({
  deleteUploadThingFile: deleteUploadThingFileMock,
  registerWorkspaceUploadedFile: registerWorkspaceUploadedFileMock,
}));

import {
  getGooglePickerToken,
  importGoogleDriveFiles,
  parseGoogleDriveImportPayload,
} from "@/lib/imports-google-drive-runtime";

describe("imports google drive runtime", () => {
  beforeEach(() => {
    deleteUploadThingFileMock.mockReset();
    getProviderAccessTokenMock.mockReset();
    registerWorkspaceUploadedFileMock.mockReset();
    requireDataImportDestinationMock.mockReset();
    uploadStorageFileMock.mockReset();
  });

  it("parses google drive import payloads and returns picker token", async () => {
    expect(parseGoogleDriveImportPayload({ fileIds: ["file-1"] })).toEqual({
      fileIds: ["file-1"],
    });

    getProviderAccessTokenMock.mockResolvedValue({ accessToken: "token" });
    await expect(getGooglePickerToken("user-1")).resolves.toEqual({
      accessToken: "token",
    });
  });

  it("imports drive files through metadata fetch and uploaded registration", async () => {
    process.env.UPLOADTHING_TOKEN = "uploadthing-token";
    getProviderAccessTokenMock.mockResolvedValue({ accessToken: "token" });
    requireDataImportDestinationMock.mockResolvedValue({
      createdAt: new Date("2026-05-17T00:00:00.000Z"),
      folderId: "folder-1",
      updatedAt: new Date("2026-05-17T00:00:00.000Z"),
      workspaceId: "workspace-1",
    });
    uploadStorageFileMock.mockResolvedValue({
      key: "uploaded-key",
      url: "https://cdn.example.com/file.pdf",
    });
    registerWorkspaceUploadedFileMock.mockResolvedValue({
      file: { id: "file-1", name: "Guide.pdf" },
      ingestionJob: { id: "job-1" },
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "drive-file-1",
          mimeType: "application/pdf",
          name: "Guide.pdf",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new TextEncoder().encode("pdf-bytes").buffer,
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await importGoogleDriveFiles({
      fileIds: ["drive-file-1"],
      userId: "user-1",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(registerWorkspaceUploadedFileMock).toHaveBeenCalled();
    expect(result.imported[0]?.fileId).toBe("file-1");
  });
});
