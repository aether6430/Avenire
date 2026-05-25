import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("useIsMobile source", () => {
  it("keeps both source and shipped package output on a passive effect", () => {
    const sourceFiles = [
      "../../../../../packages/ui/src/hooks/use-mobile.ts",
      "../../../../../packages/ui/dist/hooks/use-mobile.js",
    ];

    for (const relativePath of sourceFiles) {
      const source = readFileSync(
        new URL(relativePath, import.meta.url),
        "utf8"
      );

      expect(source).toContain("useEffect");
      expect(source).not.toContain("useLayoutEffect");
    }
  });
});
