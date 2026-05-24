import { describe, expect, it } from "vitest";
import {
  buildExplorerRegisterFilePayload,
  buildExplorerUploadPreflightInput,
  type ExplorerPreparedUpload,
} from "@/components/files/explorer/explorer-upload-batch";

describe("Explorer upload batch", () => {
  it("builds register payloads from prepared uploads with uploaded metadata precedence", () => {
    const file = new File(["hello"], "note.md", {
      type: "text/markdown",
    });
    const prepared: ExplorerPreparedUpload = {
      content: "# note",
      contentHashSha256: "abc123",
      file,
      queueItemId: "queue-1",
      targetFolderId: "folder-7",
      uploaded: {
        contentType: "text/plain",
        key: "storage-key",
        name: "remote-note.txt",
        size: 99,
        ufsUrl: "https://cdn.example.com/remote-note.txt",
      },
    };

    expect(buildExplorerRegisterFilePayload(prepared)).toEqual({
      clientUploadId: "queue-1",
      content: "# note",
      contentHashSha256: "abc123",
      folderId: "folder-7",
      hashComputedBy: "client",
      mimeType: "text/plain",
      name: "remote-note.txt",
      sizeBytes: 99,
      storageKey: "storage-key",
      storageUrl: "https://cdn.example.com/remote-note.txt",
    });
  });

  it("falls back to local file metadata when no upload transport metadata exists", () => {
    const file = new File(["binary"], "clip.mp4", {
      type: "video/mp4",
    });

    expect(
      buildExplorerRegisterFilePayload({
        file,
        queueItemId: "queue-2",
        targetFolderId: "folder-9",
      })
    ).toEqual({
      clientUploadId: "queue-2",
      content: undefined,
      contentHashSha256: undefined,
      folderId: "folder-9",
      hashComputedBy: undefined,
      mimeType: "video/mp4",
      name: "clip.mp4",
      sizeBytes: 6,
      storageKey: undefined,
      storageUrl: undefined,
    });
  });

  it("builds upload preflight input for the resolved target folder and passes through the computed checksum", () => {
    const file = new File(["binary"], "nested/clip.mp4", {
      type: "video/mp4",
    });

    expect(
      buildExplorerUploadPreflightInput({
        contentHashSha256:
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        file,
        targetFolderId: "folder-child",
        workspaceUuid: "workspace-1",
      })
    ).toEqual({
      checksumSha256:
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      file,
      folderId: "folder-child",
      workspaceUuid: "workspace-1",
    });
  });
});
