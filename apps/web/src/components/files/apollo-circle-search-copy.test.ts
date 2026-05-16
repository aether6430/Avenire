import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const surfaceFile = path.resolve(
  import.meta.dirname,
  "./circle-to-ai-search-surface.tsx"
);
const popoverFile = path.resolve(
  import.meta.dirname,
  "./circle-to-ai-search-popover.tsx"
);
const overlayHookFile = path.resolve(
  import.meta.dirname,
  "./use-circle-to-ai-search-overlay.ts"
);

describe("Apollo circle search copy", () => {
  it("uses Apollo consistently across the circle-to-ai search surface, popover, and error fallback", () => {
    const surfaceSource = readFileSync(surfaceFile, "utf8");
    const popoverSource = readFileSync(popoverFile, "utf8");
    const overlayHookSource = readFileSync(overlayHookFile, "utf8");

    expect(surfaceSource).toContain("Apollo search surface");
    expect(surfaceSource).toContain("Apollo selection overlay");
    expect(surfaceSource).toContain(
      "Apollo is thinking through the selection..."
    );
    expect(surfaceSource).not.toContain("Halo");

    expect(popoverSource).toContain("Apollo");
    expect(popoverSource).toContain(
      "Ask Apollo a question about the selection."
    );
    expect(popoverSource).toContain(
      "Latest answer ready. Ask Apollo a follow-up below."
    );
    expect(popoverSource).not.toContain("Halo");

    expect(overlayHookSource).toContain(
      'chatError.message || "Apollo failed."'
    );
    expect(overlayHookSource).not.toContain("Halo failed.");
  });
});
