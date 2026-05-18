import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./divide", () => ({
  DivideX: () => createElement("div", { "data-divide-x": "1" }),
}));

vi.mock("./footer", () => ({
  Footer: () => createElement("footer", { "data-footer": "1" }),
}));

vi.mock("./navbar", () => ({
  Navbar: () => createElement("nav", { "data-navbar": "1" }),
}));

import {
  MarketingPageFrame,
  MarketingPageShell,
} from "@/components/marketing/page-shell";

describe("marketing page shell", () => {
  it("renders the marketing shell with navbar/footer and optional divider", () => {
    const withoutDivider = renderToStaticMarkup(
      <MarketingPageShell>
        <div>CONTENT</div>
      </MarketingPageShell>
    );
    const withDivider = renderToStaticMarkup(
      <MarketingPageShell showDividerAfterNav>
        <div>CONTENT</div>
      </MarketingPageShell>
    );

    expect(withoutDivider).toContain('data-navbar="1"');
    expect(withoutDivider).toContain('data-footer="1"');
    expect(withoutDivider).toContain("CONTENT");
    expect(withoutDivider).not.toContain('data-divide-x="1"');
    expect(withDivider).toContain('data-divide-x="1"');
  });

  it("renders the marketing frame with overridable section/frame/content classes", () => {
    const html = renderToStaticMarkup(
      <MarketingPageFrame
        contentClassName="content-override"
        frameClassName="frame-override"
        sectionClassName="section-override"
      >
        <div>FRAME_CONTENT</div>
      </MarketingPageFrame>
    );

    expect(html).toContain("section-override");
    expect(html).toContain("frame-override");
    expect(html).toContain("content-override");
    expect(html).toContain("FRAME_CONTENT");
  });
});
