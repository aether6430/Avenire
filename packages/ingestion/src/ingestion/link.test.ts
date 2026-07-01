import { afterEach, describe, expect, it, vi } from "vitest";
import { extractLinkPreview } from "./link";

const articleHtml = `<!doctype html>
<html>
  <head>
    <title>Project Glasswing</title>
    <meta property="og:type" content="article">
    <meta property="og:title" content="Project Glasswing">
    <meta name="description" content="Securing critical software for the AI era">
  </head>
  <body>
    <nav>Navigation should not dominate the extraction</nav>
    <main>
      <article>
        <h2>Introduction</h2>
        <p>Today we're announcing Project Glasswing, a new initiative for securing critical software.</p>
        <p>We formed Project Glasswing because of capabilities we've observed in a new frontier model.</p>
        <p>Claude Mythos Preview is a general-purpose frontier model that reveals a stark fact.</p>
        <p><strong>Mythos Preview</strong> has already found thousands of high-severity vulnerabilities.</p>
        <p>Project Glasswing is an urgent attempt to put these capabilities to work for defensive purposes.</p>
        <p>For cyber defenders to come out ahead, we need to act now.</p>
        <p>\\## Escaped markdown heading should still parse</p>
        <p>https://www-cdn.anthropic.com/images/asset-250x250.png?w=256</p>
        <p><img src="https://www-cdn.anthropic.com/images/icon-163x98.svg" alt=""></p>
      </article>
    </main>
  </body>
</html>`;

describe("link ingestion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("extracts blog posts as clean reader markdown instead of raw HTML", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(articleHtml, { status: 200 }))
    );

    const preview = await extractLinkPreview("https://anthropic.com/glasswing");

    expect(preview.displayMode).toBe("embed");
    expect(preview.kind).toBe("article");
    expect(preview.readerMarkdown).toContain("Introduction");
    expect(preview.readerMarkdown).toContain("**Mythos Preview**");
    expect(preview.readerMarkdown).toContain(
      "## Escaped markdown heading should still parse"
    );
    expect(preview.readerMarkdown).not.toMatch(/<\/?(main|article|p|h2)\b/i);
    expect(preview.readerMarkdown).not.toMatch(/\.svg/i);
    expect(preview.readerMarkdown).not.toMatch(
      /www-cdn\.anthropic\.com\/images/i
    );
  });
});
