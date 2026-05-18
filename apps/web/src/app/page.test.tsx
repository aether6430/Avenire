import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { landingPageMock } = vi.hoisted(() => ({
  landingPageMock: vi.fn(() =>
    createElement("div", { "data-landing-page": "1" })
  ),
}));

vi.mock("@/components/marketing/landing-page", () => ({
  LandingPage: landingPageMock,
}));

import Page, { metadata } from "./page";

describe("home page contract", () => {
  it("publishes the public home metadata and structured data script", () => {
    const html = renderToStaticMarkup(<Page />);

    expect(metadata.title).toBe(
      "AI Learning Workspace for clearer thinking — Avenire"
    );
    expect(metadata.description).toBe(
      "Study from sources, ask better questions, and turn notes into review."
    );
    expect(landingPageMock).toHaveBeenCalledTimes(1);
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain('"@type":"Organization"');
    expect(html).toContain('"@type":"SoftwareApplication"');
    expect(html).toContain('"@type":"WebSite"');
    expect(html).toContain('data-landing-page="1"');
  });
});
