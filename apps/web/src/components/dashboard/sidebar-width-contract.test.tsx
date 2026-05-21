import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("sidebar width contract", () => {
  it("keeps sidebar width classes on valid CSS variable syntax in source and shipped output", () => {
    const files = [
      "../../../../../packages/ui/src/components/sidebar.tsx",
      "../../../../../packages/ui/dist/components/sidebar.js",
    ];

    for (const relativePath of files) {
      const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");

      expect(source).not.toContain("w-(--sidebar-width)");
      expect(source).not.toContain("w-(--sidebar-width-icon)");
      expect(source).toContain("w-[var(--sidebar-width)]");
      expect(source).toContain("w-[var(--sidebar-width-icon)]");
    }
  });
});
