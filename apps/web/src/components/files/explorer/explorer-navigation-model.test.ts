import { describe, expect, it } from "vitest";
import {
  buildExplorerFileRoute,
  buildExplorerFolderRoute,
  resolveExplorerFileTargetFolderId,
} from "@/components/files/explorer/explorer-navigation-model";
import type { FileRecord } from "@/components/files/explorer/shared";

function createFileRecord(id: string, folderId: string) {
  return {
    folderId,
    id,
    name: `${id}.md`,
  } as FileRecord;
}

describe("Explorer navigation model", () => {
  it("builds folder routes and file routes with stable query semantics", () => {
    expect(
      buildExplorerFolderRoute({
        folderId: "folder-1",
        workspaceUuid: "workspace-1",
      })
    ).toBe("/workspace/files/workspace-1/folder/folder-1");

    expect(
      buildExplorerFileRoute({
        baseSearchParams: "retrievalChunk=chunk-a&circleToAi=1",
        fileId: "file-1",
        folderId: "folder-1",
        workspaceUuid: "workspace-1",
      })
    ).toBe(
      "/workspace/files/workspace-1/folder/folder-1?retrievalChunk=chunk-a&file=file-1"
    );

    expect(
      buildExplorerFileRoute({
        baseSearchParams: "retrievalChunk=chunk-a&circleToAi=1",
        fileId: "file-2",
        folderId: "folder-2",
        retrievalChunkId: null,
        workspaceUuid: "workspace-1",
      })
    ).toBe("/workspace/files/workspace-1/folder/folder-2?file=file-2");

    expect(
      buildExplorerFileRoute({
        fileId: "file-3",
        folderId: "folder-3",
        retrievalChunkId: "chunk-b",
        workspaceUuid: "workspace-1",
      })
    ).toBe(
      "/workspace/files/workspace-1/folder/folder-3?file=file-3&retrievalChunk=chunk-b"
    );
  });

  it("resolves file target folders with a safe fallback", () => {
    const files = [
      createFileRecord("file-1", "folder-a"),
      createFileRecord("file-2", "folder-b"),
    ];

    expect(
      resolveExplorerFileTargetFolderId(files, "file-2", "fallback-folder")
    ).toBe("folder-b");
    expect(
      resolveExplorerFileTargetFolderId(
        files,
        "missing-file",
        "fallback-folder"
      )
    ).toBe("fallback-folder");
  });
});
