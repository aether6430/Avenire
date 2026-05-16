import { describe, expect, it } from "vitest";

import { getSidebarTreeFileIconSrc } from "@/components/dashboard/sidebar-files-panel-tree-model";

describe("sidebar files panel tree model", () => {
  it("maps known file extensions to branded tree icons and falls back for unknown files", () => {
    expect(getSidebarTreeFileIconSrc("notes.md")).toBe("/icons/markdown.svg");
    expect(getSidebarTreeFileIconSrc("deck.PDF")).toBe("/icons/pdf.svg");
    expect(getSidebarTreeFileIconSrc("archive.unknown")).toBe(
      "/icons/_file.svg"
    );
    expect(getSidebarTreeFileIconSrc("README")).toBe("/icons/_file.svg");
  });
});
