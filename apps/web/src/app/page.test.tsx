import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { getAllPostMetasMock, getAllSlugsMock, landingPageMock } = vi.hoisted(
  () => ({
    getAllPostMetasMock: vi.fn(() => [
      {
        date: "2026-05-18T12:00:00.000Z",
        slug: "introducing-avenire",
      },
    ]),
    getAllSlugsMock: vi.fn(() => ["introducing-avenire"]),
    landingPageMock: vi.fn(() =>
      createElement("div", { "data-landing-page": "1" })
    ),
  })
);

vi.mock("@/components/marketing/landing-page", () => ({
  LandingPage: landingPageMock,
}));

vi.mock("@/lib/blog", () => ({
  getAllPostMetas: getAllPostMetasMock,
  getAllSlugs: getAllSlugsMock,
}));

import Page, { dynamic, metadata } from "./page";
import sitemap from "./sitemap";

describe("home page contract", () => {
  it("publishes static landing metadata and the structured-data shell", () => {
    const html = renderToStaticMarkup(<Page />);

    expect(dynamic).toBe("force-static");
    expect(metadata.title).toBe(
      "AI Learning Workspace for Notes, Methods, and Mindset Sets — Avenire"
    );
    expect(metadata.description).toBe(
      "Upload notes, PDFs, and study materials. Avenire turns them into methods, Mindset Sets, weak-spot review, and guided AI explanations for clearer thinking."
    );
    expect(landingPageMock).toHaveBeenCalledTimes(1);
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain('"@type":"Organization"');
    expect(html).toContain('"@type":"SoftwareApplication"');
    expect(html).toContain('"@type":"WebSite"');
    expect(html).toContain('"featureList"');
    expect(html).toContain("Guided methods for hard questions");
    expect(html).toContain("Mindset Set generation and review");
    expect(html).not.toContain("Flashcard and quiz generation");
    expect(html).toContain('data-landing-page="1"');
  });

  it("publishes the current public sitemap priorities and stable last-modified contract", () => {
    const entries = sitemap();

    expect(entries).toContainEqual(
      expect.objectContaining({
        changeFrequency: "weekly",
        lastModified: "2026-05-20",
        priority: 1,
        url: expect.stringMatching(/\/?$/),
      })
    );
    expect(entries).toContainEqual(
      expect.objectContaining({
        changeFrequency: "yearly",
        lastModified: "2026-05-20",
        priority: 0.4,
        url: expect.stringContaining("/privacy"),
      })
    );
    expect(entries).toContainEqual(
      expect.objectContaining({
        changeFrequency: "monthly",
        lastModified: "2026-05-18T12:00:00.000Z",
        priority: 0.7,
        url: expect.stringContaining("/blog/introducing-avenire"),
      })
    );
    expect(getAllPostMetasMock).toHaveBeenCalledTimes(1);
  });
});
