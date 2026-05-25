import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { STATIC_ASSETS } from "./static-assets";

describe("STATIC_ASSETS", () => {
  it("serves the marketing hero image from the local public directory", () => {
    expect(STATIC_ASSETS.avenireWorkspace.startsWith("/")).toBe(true);

    const assetPath = path.resolve(
      import.meta.dirname,
      "../../public",
      STATIC_ASSETS.avenireWorkspace.slice(1)
    );

    expect(existsSync(assetPath)).toBe(true);
  });
});
