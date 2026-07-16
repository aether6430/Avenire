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

  it("gets reader markdown and a full-page screenshot in one Firecrawl run", async () => {
    scrapeMock.mockResolvedValue({
      markdown:
        "## Introduction\n\nToday we're announcing Project Glasswing.\n\n**Mythos Preview** found critical vulnerabilities.",
      metadata: {
        description: "Securing critical software for the AI era",
        favicon: "https://anthropic.com/favicon.ico",
        title: "Project Glasswing",
      },
      screenshot: "https://firecrawl.example/screenshots/glasswing.png",
      summary: "A new initiative for securing critical software.",
    });

    const preview = await extractLinkPreview("https://anthropic.com/glasswing");

    expect(preview.mode).toBe("firecrawl");
    expect(preview.provider).toBe("firecrawl");
    expect(preview.kind).toBe("article");
    expect(preview.imageUrl).toBe(
      "https://firecrawl.example/screenshots/glasswing.png"
    );
    expect(preview.readerMarkdown).toContain("Introduction");
    expect(preview.readerMarkdown).toContain("**Mythos Preview**");
    expect(scrapeMock).toHaveBeenCalledTimes(1);
    expect(scrapeMock).toHaveBeenCalledWith(
      "https://anthropic.com/glasswing",
      expect.objectContaining({
        formats: expect.arrayContaining([
          "markdown",
          "summary",
          expect.objectContaining({ fullPage: true, type: "screenshot" }),
        ]),
        onlyMainContent: true,
      })
    );
  });
});
