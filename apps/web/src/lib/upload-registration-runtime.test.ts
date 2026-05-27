import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  canStoreBytesForUserMock,
  createWorkspaceNoteFileMock,
  deleteStorageFilesMock,
  getFileAssetByContentHashMock,
  getFileAssetByStorageKeyMock,
  hasSuccessfulIngestionForFileMock,
  publishFilesInvalidationEventMock,
  publishWorkspaceStreamEventMock,
  registerFileAssetMock,
  scheduleIngestionJobMock,
  softDeleteFileAssetMock,
} = vi.hoisted(() => ({
  canStoreBytesForUserMock: vi.fn(),
  createWorkspaceNoteFileMock: vi.fn(),
  getFileAssetByContentHashMock: vi.fn(),
  getFileAssetByStorageKeyMock: vi.fn(),
  hasSuccessfulIngestionForFileMock: vi.fn(),
  publishFilesInvalidationEventMock: vi.fn(),
  publishWorkspaceStreamEventMock: vi.fn(),
  registerFileAssetMock: vi.fn(),
  scheduleIngestionJobMock: vi.fn(),
  softDeleteFileAssetMock: vi.fn(),
  deleteStorageFilesMock: vi.fn(),
}));

vi.mock("@avenire/ingestion/queue", () => ({
  scheduleIngestionJob: scheduleIngestionJobMock,
}));

vi.mock("@avenire/storage", () => ({
  deleteStorageFiles: deleteStorageFilesMock,
}));

vi.mock("@avenire/database", () => ({
  canStoreBytesForUser: canStoreBytesForUserMock,
  hasSuccessfulIngestionForFile: hasSuccessfulIngestionForFileMock,
}));

vi.mock("@/lib/file-data", () => ({
  createWorkspaceNoteFile: createWorkspaceNoteFileMock,
  getFileAssetByContentHash: getFileAssetByContentHashMock,
  getFileAssetByStorageKey: getFileAssetByStorageKeyMock,
  registerFileAsset: registerFileAssetMock,
  softDeleteFileAsset: softDeleteFileAssetMock,
}));

vi.mock("@/lib/files-realtime-publisher", () => ({
  publishFilesInvalidationEvent: publishFilesInvalidationEventMock,
}));

vi.mock("@/lib/workspace-event-stream", () => ({
  publishWorkspaceStreamEvent: publishWorkspaceStreamEventMock,
}));

vi.mock("@/lib/upload-registration-model", () => ({
  extractMarkdownNotePayload: vi.fn(
    (input: { rawContent: string; metadata?: Record<string, unknown> }) => ({
      content: input.rawContent,
      contentHashSha256:
        "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
      metadata: input.metadata,
    })
  ),
  isMarkdownUpload: vi.fn(
    (input: { mimeType?: string | null; name: string }) =>
      input.mimeType === "text/markdown" || input.name.endsWith(".md")
  ),
  normalizeSha256: vi.fn((value: string | null | undefined) => value ?? null),
  normalizeUploadThingStorageUrl: vi.fn((url: string) => url),
  resolveMimeType: vi.fn(
    (input: { mimeType?: string | null }) => input.mimeType ?? null
  ),
}));

const uploadRegistrationBarrelSource = readFileSync(
  resolve(import.meta.dirname, "upload-registration.ts"),
  "utf8"
);
const uploadRegistrationModelSource = readFileSync(
  resolve(import.meta.dirname, "upload-registration-model.ts"),
  "utf8"
);
const uploadRegistrationRuntimeSource = readFileSync(
  resolve(import.meta.dirname, "upload-registration-runtime.ts"),
  "utf8"
);

import {
  deleteUploadThingFile,
  registerWorkspaceMarkdownNote,
  registerWorkspaceUploadedFile,
} from "@/lib/upload-registration-runtime";

describe("upload registration runtime", () => {
  beforeEach(() => {
    canStoreBytesForUserMock.mockReset();
    createWorkspaceNoteFileMock.mockReset();
    getFileAssetByContentHashMock.mockReset();
    getFileAssetByStorageKeyMock.mockReset();
    hasSuccessfulIngestionForFileMock.mockReset();
    publishFilesInvalidationEventMock.mockReset();
    publishWorkspaceStreamEventMock.mockReset();
    registerFileAssetMock.mockReset();
    scheduleIngestionJobMock.mockReset();
    softDeleteFileAssetMock.mockReset();
    deleteStorageFilesMock.mockReset();
    canStoreBytesForUserMock.mockResolvedValue({
      ok: true,
      limitBytes: 2 * 1024 * 1024 * 1024,
      remainingBytes: 2 * 1024 * 1024 * 1024,
      usedBytes: 0,
    });
  });

  it("deduplicates markdown notes when an existing content hash already exists", async () => {
    getFileAssetByContentHashMock.mockResolvedValue({
      folderId: "folder-1",
      id: "file-1",
    });
    hasSuccessfulIngestionForFileMock.mockResolvedValue(true);

    const result = await registerWorkspaceMarkdownNote({
      content: "# Note",
      folderId: "folder-1",
      name: "note.md",
      userId: "user-1",
      workspaceUuid: "workspace-1",
    });

    expect(result.status).toBe("deduplicated");
    expect(createWorkspaceNoteFileMock).not.toHaveBeenCalled();
  });

  it("creates markdown notes and schedules ingestion when no duplicate exists", async () => {
    getFileAssetByContentHashMock.mockResolvedValue(null);
    createWorkspaceNoteFileMock.mockResolvedValue({
      id: "file-2",
    });
    scheduleIngestionJobMock.mockResolvedValue({ id: "job-1" });

    const result = await registerWorkspaceMarkdownNote({
      content: "# Note",
      folderId: "folder-1",
      name: "note.md",
      userId: "user-1",
      workspaceUuid: "workspace-1",
    });

    expect(result.status).toBe("created");
    expect(createWorkspaceNoteFileMock).toHaveBeenCalled();
    expect(scheduleIngestionJobMock).toHaveBeenCalled();
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(1, {
      fileId: "file-2",
      folderId: "folder-1",
      reason: "file.created",
      workspaceUuid: "workspace-1",
    });
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(2, {
      reason: "tree.changed",
      workspaceUuid: "workspace-1",
    });
  });

  it("cleans up uploadthing files best-effort", async () => {
    process.env.UPLOADTHING_TOKEN = "token";
    await deleteUploadThingFile("key-1");
    expect(deleteStorageFilesMock).toHaveBeenCalledWith(["key-1"]);
  });

  it("delegates markdown uploaded files through markdown note registration", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "# Imported note",
    });
    vi.stubGlobal("fetch", fetchMock);
    getFileAssetByContentHashMock.mockResolvedValue(null);
    createWorkspaceNoteFileMock.mockResolvedValue({ id: "file-3" });
    scheduleIngestionJobMock.mockResolvedValue({ id: "job-2" });

    const result = await registerWorkspaceUploadedFile({
      folderId: "folder-1",
      mimeType: "text/markdown",
      name: "note.md",
      sizeBytes: 12,
      storageKey: "upload-key",
      storageUrl: "https://utfs.io/f/upload-key",
      userId: "user-1",
      workspaceUuid: "workspace-1",
    });

    expect(fetchMock).toHaveBeenCalled();
    expect(result.status).toBe("created");
  });

  it("registers binary uploads without a separate upload-credit gate", async () => {
    registerFileAssetMock.mockResolvedValue({ id: "file-4" });
    scheduleIngestionJobMock.mockResolvedValue({ id: "job-4" });
    getFileAssetByStorageKeyMock.mockResolvedValue(null);

    const result = await registerWorkspaceUploadedFile({
      contentHashSha256: "hash-1",
      folderId: "folder-1",
      mimeType: "application/pdf",
      name: "guide.pdf",
      sizeBytes: 42,
      storageKey: "binary-key",
      storageUrl: "https://cdn.example.com/guide.pdf",
      userId: "user-1",
      workspaceUuid: "workspace-1",
    });

    expect(result).toMatchObject({
      status: "created",
      file: { id: "file-4" },
      ingestionJob: { id: "job-4" },
    });
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(1, {
      fileId: "file-4",
      folderId: "folder-1",
      reason: "file.created",
      workspaceUuid: "workspace-1",
    });
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(2, {
      reason: "tree.changed",
      workspaceUuid: "workspace-1",
    });
    expect(softDeleteFileAssetMock).not.toHaveBeenCalled();
    expect(deleteStorageFilesMock).not.toHaveBeenCalled();
  });

  it("cleans up uploaded binaries and fails closed when storage quota is exceeded", async () => {
    getFileAssetByStorageKeyMock.mockResolvedValue(null);
    canStoreBytesForUserMock.mockResolvedValueOnce({
      ok: false,
      limitBytes: 2048,
      remainingBytes: 0,
      usedBytes: 2048,
    });

    await expect(
      registerWorkspaceUploadedFile({
        folderId: "folder-1",
        mimeType: "application/pdf",
        name: "guide.pdf",
        sizeBytes: 42,
        storageKey: "binary-key",
        storageUrl: "https://cdn.example.com/guide.pdf",
        userId: "user-1",
        workspaceUuid: "workspace-1",
      })
    ).rejects.toMatchObject({
      code: "STORAGE_LIMIT",
      limitBytes: 2048,
      usedBytes: 2048,
    });

    expect(registerFileAssetMock).not.toHaveBeenCalled();
    expect(deleteStorageFilesMock).toHaveBeenCalledWith(["binary-key"]);
  });

  it("keeps upload registration split between typed barrel exports, pure normalization helpers, and side-effect runtime work", () => {
    expect(uploadRegistrationBarrelSource).toContain(
      "export interface UploadRegistrationInput"
    );
    expect(uploadRegistrationBarrelSource).toContain(
      "@/lib/upload-registration-model"
    );
    expect(uploadRegistrationBarrelSource).toContain(
      "@/lib/upload-registration-runtime"
    );
    expect(uploadRegistrationBarrelSource).not.toContain(
      "scheduleIngestionJob("
    );
    expect(uploadRegistrationBarrelSource).not.toContain("deleteStorageFiles(");
    expect(uploadRegistrationBarrelSource).not.toContain("registerFileAsset(");

    expect(uploadRegistrationModelSource).toContain(
      "export function extractMarkdownNotePayload"
    );
    expect(uploadRegistrationModelSource).toContain(
      "export function normalizeUploadThingStorageUrl"
    );
    expect(uploadRegistrationModelSource).not.toContain(
      "scheduleIngestionJob("
    );
    expect(uploadRegistrationModelSource).not.toContain("deleteStorageFiles(");

    expect(uploadRegistrationRuntimeSource).toContain("scheduleIngestionJob");
    expect(uploadRegistrationRuntimeSource).toContain("deleteStorageFiles");
    expect(uploadRegistrationRuntimeSource).toContain("registerFileAsset");
    expect(uploadRegistrationRuntimeSource).toContain(
      "publishWorkspaceStreamEvent"
    );
    expect(uploadRegistrationRuntimeSource).toContain(
      "extractMarkdownNotePayload"
    );
    expect(uploadRegistrationRuntimeSource).toContain(
      'from "@avenire/database"'
    );
    expect(uploadRegistrationRuntimeSource).not.toContain(
      "@/lib/database-billing-metering"
    );
  });
});
