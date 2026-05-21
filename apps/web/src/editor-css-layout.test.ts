import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const editorCss = readFileSync(resolve(import.meta.dirname, "./editor.css"), {
  encoding: "utf8",
});

describe("editor.css responsive note layout", () => {
  it("keeps frontmatter rows away from the mobile viewport edge", () => {
    expect(editorCss).toContain(".scribe-frontmatter-panel");
    expect(editorCss).toContain("padding-inline: 1rem;");
  });
});
