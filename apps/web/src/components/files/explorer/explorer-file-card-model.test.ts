import { describe, expect, it } from "vitest";
import { buildExplorerFileCardModel } from "@/components/files/explorer/explorer-file-card-model";
import type { FileRecord } from "@/components/files/explorer/shared";
import type { WorkspacePropertyDefinition } from "@/lib/frontmatter";

function buildFile(overrides: Partial<FileRecord> = {}): FileRecord {
  return {
    createdAt: "2026-05-13T00:00:00.000Z",
    folderId: "folder-1",
    id: "file-1",
    mimeType: "text/markdown",
    name: "Welcome.md",
    page: {
      bannerUrl: null,
      icon: " sparkles!! ",
      properties: {
        priority: { type: "number", value: 3 },
        status: { type: "select", value: "Open" },
      },
    },
    sizeBytes: 2048,
    storageUrl: "https://example.com/welcome.md",
    updatedAt: "2026-05-13T01:00:00.000Z",
    ...overrides,
  };
}

describe("explorer file card model", () => {
  it("builds display name, visible card details, and normalized file type", () => {
    const definitions: WorkspacePropertyDefinition[] = [
      { key: "priority", type: "number" } as WorkspacePropertyDefinition,
      { key: "status", type: "select" } as WorkspacePropertyDefinition,
      { key: "missing", type: "text" } as WorkspacePropertyDefinition,
    ];

    const model = buildExplorerFileCardModel({
      displayName: "Welcome",
      file: buildFile(),
      fileType: "sheet",
      isPreviewing: false,
      isWarmed: false,
      openedCached: false,
      selectedCardPropertyDefinitions: definitions,
    });

    expect(model.displayName).toBe("sparkles Welcome");
    expect(model.resolvedFileType).toBe("document");
    expect(model.details).toEqual([
      { label: "priority", value: "3" },
      { label: "status", value: "Open" },
    ]);
  });

  it("builds preview models for markdown, pdf, image, and video files", () => {
    expect(
      buildExplorerFileCardModel({
        displayName: "Note",
        file: buildFile({ noteContent: "# Hello" }),
        fileType: "document",
        isPreviewing: false,
        isWarmed: false,
        openedCached: false,
        selectedCardPropertyDefinitions: [],
      }).preview
    ).toEqual({
      content: "# Hello",
      kind: "markdown",
    });

    expect(
      buildExplorerFileCardModel({
        displayName: "Guide",
        file: buildFile({
          mimeType: "application/pdf",
          name: "Guide.pdf",
          storageUrl: "https://example.com/guide.pdf",
        }),
        fileType: "document",
        isPreviewing: false,
        isWarmed: false,
        openedCached: false,
        selectedCardPropertyDefinitions: [],
      }).preview
    ).toEqual({
      kind: "pdf",
      src: "https://example.com/guide.pdf",
    });

    expect(
      buildExplorerFileCardModel({
        displayName: "Photo",
        file: buildFile({
          mimeType: "image/png",
          name: "photo.png",
          storageUrl: "https://example.com/photo.png",
        }),
        fileType: "image",
        isPreviewing: false,
        isWarmed: false,
        openedCached: false,
        selectedCardPropertyDefinitions: [],
      }).preview
    ).toEqual({
      alt: "photo.png",
      kind: "image",
      src: "https://example.com/photo.png",
    });

    expect(
      buildExplorerFileCardModel({
        displayName: "Lecture",
        file: buildFile({
          mimeType: "video/mp4",
          name: "lecture.mp4",
          sizeBytes: 9876,
          storageUrl: "https://example.com/lecture.mp4",
        }),
        fileType: "video",
        isPreviewing: true,
        isWarmed: true,
        openedCached: false,
        selectedCardPropertyDefinitions: [],
      }).preview
    ).toMatchObject({
      kind: "video",
      openedCached: true,
      sizeBytes: 9876,
      warm: true,
    });
  });
});
