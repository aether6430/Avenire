import { describe, expect, it } from "vitest";

import {
  extractCodeLanguage,
  normalizeMarkdownContent,
  normalizeMathDelimiters,
  normalizeWorkspaceFileLinks,
  resolveBundledLanguage,
} from "@/components/chat/markdown-model";

describe("chat markdown model", () => {
  it("extracts bundled code languages and normalizes aliases", () => {
    expect(extractCodeLanguage("language-typescript")).toBe("typescript");
    expect(extractCodeLanguage("foo language-mermaid bar")).toBe("mermaid");
    expect(extractCodeLanguage(undefined)).toBe("");

    expect(resolveBundledLanguage("typescript")).toBe("typescript");
    expect(resolveBundledLanguage("ts")).toBe("ts");
    expect(resolveBundledLanguage("definitely-not-a-language")).toBeNull();
  });

  it("normalizes workspace-file links and math delimiters", () => {
    expect(
      normalizeWorkspaceFileLinks("[Spec](workspace-file://notes/My spec.md)")
    ).toBe("[Spec](workspace-file://notes/My%20spec.md)");

    expect(
      normalizeMathDelimiters(
        String.raw`[/math]x + y[/math] and \[z\] and [/inline]a + b[/inline] and \(c\)`
      )
    ).toBe("$$x + y$$ and $$z$$ and $a + b$ and $c$");
  });

  it("builds normalized markdown content without remending workspace-file payloads", () => {
    expect(
      normalizeMarkdownContent({
        content: "[Open](workspace-file://folder/My note.md)",
        parseIncompleteMarkdown: true,
      })
    ).toBe("[Open](workspace-file://folder/My%20note.md)");

    expect(
      normalizeMarkdownContent({
        content: "**unfinished",
        parseIncompleteMarkdown: true,
      })
    ).toContain("**unfinished**");
  });
});
