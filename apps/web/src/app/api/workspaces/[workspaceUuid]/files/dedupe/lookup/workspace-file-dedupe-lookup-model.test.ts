import { describe, expect, it } from "vitest";
import {
  buildWorkspaceFileDedupeLookupResult,
  resolveWorkspaceFileDedupeLookupRequest,
} from "./workspace-file-dedupe-lookup-model";

describe("workspace file dedupe lookup model", () => {
  it("rejects invalid request payloads and normalizes valid hashes", () => {
    expect(resolveWorkspaceFileDedupeLookupRequest({ nope: true })).toBeNull();

    expect(
      resolveWorkspaceFileDedupeLookupRequest({
        files: [
          {
            clientUploadId: "upload-1",
            folderId: "11111111-1111-4111-8111-111111111111",
            hashSha256:
              " ABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD ",
            mimeType: "application/pdf",
            name: "Doc.pdf",
            sizeBytes: 42,
          },
        ],
      })
    ).toEqual({
      files: [
        {
          clientUploadId: "upload-1",
          folderId: "11111111-1111-4111-8111-111111111111",
          hashSha256:
            "abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
          mimeType: "application/pdf",
          name: "Doc.pdf",
          sizeBytes: 42,
        },
      ],
    });
  });

  it("builds miss and hit responses for dedupe results", () => {
    expect(
      buildWorkspaceFileDedupeLookupResult({
        clientUploadId: "upload-1",
        existing: null,
      })
    ).toEqual({
      clientUploadId: "upload-1",
      deduped: false,
    });

    expect(
      buildWorkspaceFileDedupeLookupResult({
        clientUploadId: "upload-2",
        existing: {
          folderId: "folder-1",
          id: "file-1",
          mimeType: "application/pdf",
          name: "Existing.pdf",
          sizeBytes: 99,
          storageUrl: "https://cdn.example.com/file-1",
        },
      })
    ).toEqual({
      clientUploadId: "upload-2",
      deduped: true,
      file: {
        folderId: "folder-1",
        id: "file-1",
        mimeType: "application/pdf",
        name: "Existing.pdf",
        sizeBytes: 99,
        storageUrl: "https://cdn.example.com/file-1",
      },
    });
  });
});
