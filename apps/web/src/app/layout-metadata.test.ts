import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const APP_ROOT = path.resolve(import.meta.dirname);
const FAVICON_PATH = path.join(APP_ROOT, "favicon.ico");

describe("root layout metadata assets", () => {
  it("ships a root favicon via the app file convention", () => {
    expect(existsSync(FAVICON_PATH)).toBe(true);
  });
});
