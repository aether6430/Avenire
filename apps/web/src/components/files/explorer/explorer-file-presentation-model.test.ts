import { describe, expect, it } from "vitest";
import {
  buildExplorerFileVisualDescriptor,
  buildExplorerWikiLinkableFiles,
  canStartExplorerFileHoverPreview,
  getExplorerFileKind,
} from "@/components/files/explorer/explorer-file-presentation-model";
import type { FileRecord } from "@/components/files/explorer/shared";

function createFileRecord(
  overrides: Partial<FileRecord> & Pick<FileRecord, "id" | "folderId" | "name">
) {
  return {
    createdAt: "2026-05-12T10:00:00.000Z",
    mimeType: "text/markdown",
    sizeBytes: 1024,
    storageUrl: "https://example.com/file",
    ...overrides,
  } as FileRecord;
}

describe("Explorer file presentation model", () => {
  it("classifies file kinds for explorer presentation", () => {
    expect(
      getExplorerFileKind(
        createFileRecord({
          folderId: "folder-1",
          id: "file-image",
          mimeType: "image/png",
          name: "cover.png",
        })
      )
    ).toBe("image");
    expect(
      getExplorerFileKind(
        createFileRecord({
          folderId: "folder-1",
          id: "file-video",
          mimeType: "video/mp4",
          name: "demo.mp4",
        })
      )
    ).toBe("video");
    expect(
      getExplorerFileKind(
        createFileRecord({
          folderId: "folder-1",
          id: "file-archive",
          mimeType: "application/octet-stream",
          name: "assets.zip",
        })
      )
    ).toBe("archive");
    expect(
      getExplorerFileKind(
        createFileRecord({
          folderId: "folder-1",
          id: "file-code",
          mimeType: "text/plain",
          name: "index.ts",
        })
      )
    ).toBe("code");
  });

  it("builds the right visual descriptor for custom icons and fallback type icons", () => {
    expect(
      buildExplorerFileVisualDescriptor(
        createFileRecord({
          folderId: "folder-1",
          id: "file-emoji",
          name: "note.md",
          page: { bannerUrl: null, icon: "🧠", properties: {} },
        }),
        "document"
      )
    ).toEqual({
      kind: "custom-glyph",
      glyph: "🧠",
    });

    expect(
      buildExplorerFileVisualDescriptor(
        createFileRecord({
          folderId: "folder-1",
          id: "file-image-icon",
          name: "note.md",
          page: {
            bannerUrl: null,
            icon: "https://example.com/icon.png",
            properties: {},
          },
        }),
        "document"
      )
    ).toEqual({
      kind: "custom-image",
      src: "https://example.com/icon.png",
    });

    expect(
      buildExplorerFileVisualDescriptor(
        createFileRecord({
          folderId: "folder-1",
          id: "file-fallback",
          name: "note.md",
          page: { bannerUrl: null, icon: null, properties: {} },
        }),
        "document"
      )
    ).toEqual({
      fileKind: "document",
      kind: "type-icon",
    });
  });

  it("gates hover preview to playable media and maps wiki-link targets from workspace paths", () => {
    expect(
      canStartExplorerFileHoverPreview(
        createFileRecord({
          folderId: "folder-1",
          id: "file-audio",
          mimeType: "audio/mp3",
          name: "voice.mp3",
        })
      )
    ).toBe(true);
    expect(
      canStartExplorerFileHoverPreview(
        createFileRecord({
          folderId: "folder-1",
          id: "file-markdown",
          mimeType: "text/markdown",
          name: "notes.md",
        })
      )
    ).toBe(false);

    expect(
      buildExplorerWikiLinkableFiles([
        {
          file: createFileRecord({
            folderId: "folder-1",
            id: "file-md",
            mimeType: "text/markdown",
            name: "Roadmap.mdx",
          }),
          nameLower: "roadmap.mdx",
          parentPath: "Product",
          pathLower: "product/roadmap.mdx",
          workspacePath: "Product/Roadmap.mdx",
        },
        {
          file: createFileRecord({
            folderId: "folder-1",
            id: "file-pdf",
            mimeType: "application/pdf",
            name: "Spec.pdf",
          }),
          nameLower: "spec.pdf",
          parentPath: "Product",
          pathLower: "product/spec.pdf",
          workspacePath: "Product/Spec.pdf",
        },
      ])
    ).toEqual([
      {
        content: "",
        excerpt: "Product/Roadmap.mdx",
        id: "file-md",
        title: "Roadmap",
      },
      {
        content: "",
        excerpt: "Product/Spec.pdf",
        id: "file-pdf",
        title: "Spec.pdf",
      },
    ]);
  });
});
