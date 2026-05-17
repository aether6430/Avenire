import { describe, expect, it } from "vitest";
import {
  getMessageTextContent,
  getResultMeta,
  getScoreLabel,
  toFastResult,
  toResultKey,
} from "@/components/files/stylized-search-bar-model";

describe("stylized search bar model", () => {
  it("builds stable result keys and fast file results", () => {
    const fastResult = toFastResult({
      description: "PDF",
      folderId: "folder-1",
      id: "file-1",
      path: "/Docs/demo.pdf",
      snippet: "",
      title: "demo.pdf",
      type: "file",
      workspaceUuid: "ws-1",
    });

    expect(
      toResultKey({
        description: "PDF",
        id: "file-1",
        score: 1,
        snippet: "",
        title: "a",
        type: "file",
      })
    ).toBe("file-1");
    expect(
      toResultKey({
        chunkId: "chunk-7",
        description: "PDF",
        id: "file-1",
        score: 1,
        snippet: "",
        title: "a",
        type: "file",
      })
    ).toBe("file-1:chunk-7");

    expect(fastResult).toMatchObject({
      fileId: "file-1",
      folderId: "folder-1",
      id: "file-1",
      snippet: "Name match",
      sourceType: "file",
      workspaceUuid: "ws-1",
    });
  });

  it("extracts summary text and formats retrieval metadata", () => {
    expect(
      getMessageTextContent({
        parts: [
          { type: "reasoning", text: "ignore" },
          { text: "Hello", type: "text" },
          { text: " world ", type: "text" },
        ],
      } as never)
    ).toBe("Hello world");

    expect(
      getResultMeta({
        description: "PDF",
        endMs: 18_000,
        id: "r1",
        page: 3,
        score: 0.8,
        snippet: "demo",
        startMs: 12_000,
        title: "Result",
        type: "file",
      })
    ).toBe("Page 3 • 0:12-0:18");
  });

  it("formats result score labels as capped percentages", () => {
    expect(getScoreLabel(0.734)).toBe("73%");
    expect(getScoreLabel(1.8)).toBe("100%");
    expect(getScoreLabel(-1)).toBe("0%");
  });
});
