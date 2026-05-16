import { describe, expect, it } from "vitest";
import {
  type FileRecord,
  getInlineMarkdownSeed,
  normalizeFilePageIcon,
} from "@/components/files/explorer/shared";

function buildFile(overrides: Partial<FileRecord>): FileRecord {
  return {
    createdAt: "2026-05-12T00:00:00.000Z",
    folderId: "folder-1",
    id: "file-1",
    mimeType: "text/markdown",
    name: "Welcome.md",
    sizeBytes: 12,
    storageUrl: "https://example.com/file",
    ...overrides,
  };
}

describe("getInlineMarkdownSeed", () => {
  it("returns inline note content for markdown files", () => {
    expect(
      getInlineMarkdownSeed(
        buildFile({ noteContent: "# Welcome\n\nInline markdown." })
      )
    ).toBe("# Welcome\n\nInline markdown.");
  });

  it("preserves empty markdown content", () => {
    expect(getInlineMarkdownSeed(buildFile({ noteContent: "" }))).toBe("");
  });

  it("returns null for non-markdown files", () => {
    expect(
      getInlineMarkdownSeed(
        buildFile({
          mimeType: "application/pdf",
          name: "Guide.pdf",
          noteContent: "# Not used",
        })
      )
    ).toBeNull();
  });
});

describe("normalizeFilePageIcon", () => {
  it("returns null for empty or non-string values", () => {
    expect(normalizeFilePageIcon(null)).toBeNull();
    expect(normalizeFilePageIcon(undefined)).toBeNull();
    expect(normalizeFilePageIcon("   ")).toBeNull();
  });

  it("preserves renderable icon urls", () => {
    expect(normalizeFilePageIcon("https://example.com/icon.png")).toBe(
      "https://example.com/icon.png"
    );
    expect(normalizeFilePageIcon("/icons/custom.svg")).toBe(
      "/icons/custom.svg"
    );
  });

  it("trims inline emoji-like values to a short display token", () => {
    expect(normalizeFilePageIcon("  sparkles!!  ")).toBe("sparkles");
    expect(normalizeFilePageIcon("abc")).toBe("abc");
  });
});
