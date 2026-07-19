import { afterEach, describe, expect, it, vi } from "vitest";

const { scrapeMock } = vi.hoisted(() => ({
  scrapeMock: vi.fn(),
}));

vi.mock("firecrawl", () => ({
  Firecrawl: class {
    scrape = scrapeMock;
  },
}));

vi.mock("../config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config")>();
  return {
    config: {
      ...actual.config,
      firecrawlApiKey: "test-key",
      firecrawlApiUrl: "",
    },
  };
});

import { extractLinkPreview } from "./link";

describe("link ingestion", () => {
  afterEach(() => {
    scrapeMock.mockReset();
  });

  it("cleans Firecrawl HTML with Defuddle and keeps the full-page screenshot", async () => {
    scrapeMock.mockResolvedValue({
      html: `<!doctype html>
        <html>
          <head>
            <title>Project Glasswing</title>
            <meta name="description" content="Securing critical software for the AI era">
            <link rel="icon" href="/favicon.ico">
          </head>
          <body>
            <nav>Products Pricing Company</nav>
            <main>
              <article>
                <h1>Project Glasswing</h1>
                <h2>Introduction</h2>
                <p>Today we're announcing Project Glasswing.</p>
                <p><strong>Mythos Preview</strong> found critical vulnerabilities.</p>
              </article>
            </main>
            <footer>Privacy Terms</footer>
          </body>
        </html>`,
      metadata: {
        description: "Fallback description",
        favicon: "https://anthropic.com/fallback.ico",
        title: "Fallback title",
      },
      screenshot: "https://firecrawl.example/screenshots/glasswing.png",
      summary: "A new initiative for securing critical software.",
    });

    const preview = await extractLinkPreview("https://anthropic.com/glasswing");

    expect(preview.mode).toBe("firecrawl");
    expect(preview.provider).toBe("firecrawl");
    expect(preview.kind).toBe("article");
    expect(preview.title).toBe("Project Glasswing");
    expect(preview.imageUrl).toBe(
      "https://firecrawl.example/screenshots/glasswing.png"
    );
    expect(preview.readerMarkdown).toContain("## Introduction");
    expect(preview.readerMarkdown).toContain("**Mythos Preview**");
    expect(preview.readerMarkdown).not.toContain("Products Pricing Company");
    expect(scrapeMock).toHaveBeenCalledTimes(1);
    expect(scrapeMock).toHaveBeenCalledWith(
      "https://anthropic.com/glasswing",
      expect.objectContaining({
        formats: expect.arrayContaining([
          "html",
          "summary",
          expect.objectContaining({ fullPage: true, type: "screenshot" }),
        ]),
        onlyMainContent: false,
      })
    );
  });
});
