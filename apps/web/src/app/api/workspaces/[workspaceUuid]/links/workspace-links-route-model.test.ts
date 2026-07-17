import { describe, expect, it } from "vitest";
import {
  deriveWorkspaceLinkDocumentTitle,
  deriveWorkspaceLinkFaviconUrl,
} from "./workspace-links-route-model";

describe("workspace link route model", () => {
  it("builds a lightweight title without waiting for extracted metadata", () => {
    expect(
      deriveWorkspaceLinkDocumentTitle({
        normalizedUrl: "https://example.com/guides/optimistic-ingestion",
        previewTitle: "",
        requestedName: "",
      })
    ).toEqual({
      fileName: "example.com optimistic ingestion.md",
      noteTitle: "example.com optimistic ingestion",
    });
  });

  it("uses an origin-relative favicon while ingestion is pending", () => {
    expect(
      deriveWorkspaceLinkFaviconUrl("https://example.com/guides/article")
    ).toBe("https://example.com/favicon.ico");
  });
});
