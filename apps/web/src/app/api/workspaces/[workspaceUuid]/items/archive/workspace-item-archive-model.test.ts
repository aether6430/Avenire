import { describe, expect, it } from "vitest";
import {
  addArchiveEntry,
  resolveRequestedArchiveItems,
  sanitizeArchiveSegment,
} from "./workspace-item-archive-model";

describe("workspace item archive model", () => {
  it("derives requested items from either the items array or the single-item fallback", () => {
    expect(
      resolveRequestedArchiveItems({
        id: "file-1",
        kind: "file",
        items: [{ id: "folder-1", kind: "folder" }],
      })
    ).toEqual([{ id: "folder-1", kind: "folder" }]);

    expect(
      resolveRequestedArchiveItems({
        id: "file-1",
        kind: "file",
      })
    ).toEqual([{ id: "file-1", kind: "file" }]);
  });

  it("sanitizes archive paths and deduplicates colliding entries", () => {
    const entries: Record<string, Uint8Array> = {};
    addArchiveEntry(entries, "Folder/Plan?.md", Buffer.from("one"));
    addArchiveEntry(entries, "Folder/Plan?.md", Buffer.from("two"));

    expect(sanitizeArchiveSegment("  Course:/Notes?  ")).toBe("Course-Notes-");
    expect(Object.keys(entries)).toEqual([
      "Folder/Plan?.md",
      "Folder/Plan? (1).md",
    ]);
  });
});
