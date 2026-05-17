import { describe, expect, it } from "vitest";
import {
  buildExplorerDedupeLookupInput,
  buildExplorerIndexedUploadCandidates,
  buildExplorerUploadQueueEntries,
  isMarkdownUploadCandidate,
  normalizeRelativePath,
  sanitizeUploadCandidates,
} from "@/components/files/explorer/explorer-upload-model";

describe("Explorer upload model", () => {
  it("normalizes, sanitizes, and dedupes upload candidates", () => {
    const markdown = new File(["# hi"], "Welcome.md", {
      lastModified: 1,
      type: "text/markdown",
    });
    const duplicate = new File(["# hi"], "Welcome.md", {
      lastModified: 1,
      type: "text/markdown",
    });
    const artifact = new File(["junk"], ".DS_Store", { lastModified: 2 });
    const zoneIdentifier = new File(["junk"], "report.pdf:Zone.Identifier", {
      lastModified: 3,
    });

    expect(normalizeRelativePath("./notes\\\\Welcome.md", markdown)).toBe(
      "notes/Welcome.md"
    );

    const sanitized = sanitizeUploadCandidates([
      { file: markdown, relativePath: "./notes//Welcome.md" },
      { file: duplicate, relativePath: "notes/Welcome.md" },
      { file: artifact, relativePath: ".DS_Store" },
      { file: zoneIdentifier, relativePath: "report.pdf:Zone.Identifier" },
    ]);

    expect(sanitized).toEqual([
      {
        file: markdown,
        relativePath: "notes/Welcome.md",
      },
    ]);
  });

  it("builds queue entries and folder-batch detection from sanitized candidates", () => {
    const nested = new File(["binary"], "photo.png", {
      lastModified: 10,
      type: "image/png",
    });
    const root = new File(["plain"], "todo.txt", {
      lastModified: 11,
      type: "text/plain",
    });

    const { isFolderUploadBatch, normalizedCandidates, queueEntries } =
      buildExplorerUploadQueueEntries(
        [
          { file: nested, relativePath: "assets/photo.png" },
          { file: root, relativePath: "todo.txt" },
        ],
        (() => {
          let index = 0;
          return () => `upload-${++index}`;
        })()
      );

    expect(isFolderUploadBatch).toBe(true);
    expect(normalizedCandidates.map((entry) => entry.relativePath)).toEqual([
      "assets/photo.png",
      "todo.txt",
    ]);
    expect(queueEntries).toEqual([
      {
        id: "upload-1",
        name: "assets/photo.png",
        sizeLabel: "6 B",
        status: "queued",
      },
      {
        id: "upload-2",
        name: "todo.txt",
        sizeLabel: "5 B",
        status: "queued",
      },
    ]);
  });

  it("builds dedupe lookup input only for hashed non-markdown files", () => {
    const markdown = new File(["# note"], "note.md", {
      lastModified: 5,
      type: "text/markdown",
    });
    const image = new File(["image"], "shot.png", {
      lastModified: 6,
      type: "image/png",
    });
    const { normalizedCandidates, queueEntries } =
      buildExplorerUploadQueueEntries(
        [
          { file: markdown, relativePath: "notes/note.md" },
          { file: image, relativePath: "shot.png" },
        ],
        (() => {
          let index = 0;
          return () => `candidate-${++index}`;
        })()
      );
    const indexed = buildExplorerIndexedUploadCandidates(
      normalizedCandidates,
      queueEntries
    );
    const hashByQueueId = new Map<string, string>([
      ["candidate-1", "hash-md"],
      ["candidate-2", "hash-image"],
    ]);

    expect(isMarkdownUploadCandidate(markdown)).toBe(true);
    expect(isMarkdownUploadCandidate(image)).toBe(false);
    expect(buildExplorerDedupeLookupInput(indexed, hashByQueueId)).toEqual([
      {
        clientUploadId: "candidate-2",
        hashSha256: "hash-image",
        mimeType: "image/png",
        name: "shot.png",
        sizeBytes: 5,
      },
    ]);
  });
});
