import { describe, expect, it } from "vitest";
import {
  getMarkdownDisplayTitle,
  stripLeadingMarkdownH1,
} from "@/lib/markdown-title";

describe("getMarkdownDisplayTitle", () => {
  it("returns the first heading for standard markdown notes", () => {
    expect(
      getMarkdownDisplayTitle("# Welcome to Avenire\n\nBody copy", "Fallback")
    ).toBe("Welcome to Avenire");
  });

  it("trims literal escaped newlines out of malformed heading content", () => {
    expect(
      getMarkdownDisplayTitle(
        "# Welcome to Avenire\\n\\nThis local dev account is ready.",
        "Fallback"
      )
    ).toBe("Welcome to Avenire");
  });

  it("prefers a frontmatter title when present", () => {
    expect(
      getMarkdownDisplayTitle(
        "---\ntitle: Product note\n---\n# Ignored heading",
        "Fallback"
      )
    ).toBe("Product note");
  });

  it("strips a leading markdown h1 from article-style content", () => {
    expect(
      stripLeadingMarkdownH1("# Introducing Avenire\n\nBody copy.\n\n## Next")
    ).toBe("Body copy.\n\n## Next");
  });

  it("leaves lower-level headings untouched", () => {
    expect(stripLeadingMarkdownH1("## Overview\n\nBody copy.")).toBe(
      "## Overview\n\nBody copy."
    );
  });
});
