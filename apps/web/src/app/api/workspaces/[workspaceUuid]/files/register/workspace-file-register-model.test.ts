import { beforeEach, describe, expect, it, vi } from "vitest";

const { extractMarkdownNotePageMetadataMock } = vi.hoisted(() => ({
  extractMarkdownNotePageMetadataMock: vi.fn(),
}));

vi.mock("@/lib/markdown-note-page-metadata", () => ({
  extractMarkdownNotePageMetadata: extractMarkdownNotePageMetadataMock,
}));

import {
  classifyStoredFileType,
  resolveWorkspaceFileRegisterMetadata,
} from "./workspace-file-register-model";

describe("workspace file register model", () => {
  beforeEach(() => {
    extractMarkdownNotePageMetadataMock.mockReset();
  });

  it("classifies stored files into stable product buckets", () => {
    expect(classifyStoredFileType(null)).toBe("unknown");
    expect(classifyStoredFileType("image/png")).toBe("image");
    expect(classifyStoredFileType("video/mp4")).toBe("video");
    expect(classifyStoredFileType("application/pdf")).toBe("pdf");
    expect(classifyStoredFileType("text/plain")).toBe("text");
    expect(classifyStoredFileType("audio/mpeg")).toBe("audio");
    expect(classifyStoredFileType("application/zip")).toBe("other");
  });

  it("merges template page metadata into existing note metadata without losing existing properties", () => {
    extractMarkdownNotePageMetadataMock.mockReturnValue({
      cover: "stars",
      properties: {
        topic: "AI",
      },
    });

    expect(
      resolveWorkspaceFileRegisterMetadata(
        {
          extra: true,
          page: {
            icon: "spark",
            properties: {
              difficulty: "hard",
            },
          },
        },
        "# Note"
      )
    ).toEqual({
      extra: true,
      page: {
        cover: "stars",
        icon: "spark",
        properties: {
          difficulty: "hard",
          topic: "AI",
        },
      },
    });
  });
});
