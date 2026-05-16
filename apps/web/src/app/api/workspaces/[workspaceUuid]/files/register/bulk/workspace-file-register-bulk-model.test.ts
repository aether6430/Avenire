import { describe, expect, it } from "vitest";
import {
  buildWorkspaceFileRegisterBulkSummary,
  countSuccessfulWorkspaceFileRegisterBulkResults,
  isWorkspaceFileRegisterBulkNotePayload,
  isWorkspaceFileRegisterBulkUploadPayload,
  type WorkspaceFileRegisterBulkResult,
  workspaceFileRegisterBulkRequestSchema,
} from "./workspace-file-register-bulk-model";

describe("workspace file register bulk model", () => {
  it("validates both markdown-note and stored-upload payload variants", () => {
    const noteParsed = workspaceFileRegisterBulkRequestSchema.safeParse({
      files: [
        {
          clientUploadId: "client-note",
          folderId: "11111111-1111-4111-8111-111111111111",
          name: "notes.md",
          content: "# Notes",
        },
      ],
    });
    const uploadParsed = workspaceFileRegisterBulkRequestSchema.safeParse({
      dedupeMode: "skip",
      files: [
        {
          clientUploadId: "client-upload",
          folderId: "22222222-2222-4222-8222-222222222222",
          name: "lecture.mp4",
          sizeBytes: 42,
          storageKey: "storage-key",
          storageUrl: "https://cdn.example.com/lecture.mp4",
        },
      ],
    });

    expect(noteParsed.success).toBe(true);
    expect(uploadParsed.success).toBe(true);
    if (!(noteParsed.success && uploadParsed.success)) {
      return;
    }

    expect(
      isWorkspaceFileRegisterBulkNotePayload(noteParsed.data.files[0]!)
    ).toBe(true);
    expect(
      isWorkspaceFileRegisterBulkUploadPayload(noteParsed.data.files[0]!)
    ).toBe(false);
    expect(
      isWorkspaceFileRegisterBulkUploadPayload(uploadParsed.data.files[0]!)
    ).toBe(true);
  });

  it("counts successful registrations and builds a stable batch summary", () => {
    const results: WorkspaceFileRegisterBulkResult[] = [
      {
        clientUploadId: "client-note",
        status: "ok",
        file: { id: "file-1" },
        ingestionJob: null,
      },
      {
        clientUploadId: "client-upload",
        status: "failed",
        error: "Read-only folder",
      },
    ];

    expect(countSuccessfulWorkspaceFileRegisterBulkResults(results)).toBe(1);
    expect(buildWorkspaceFileRegisterBulkSummary(results)).toEqual({
      total: 2,
      succeeded: 1,
      failed: 1,
    });
  });
});
