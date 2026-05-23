import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { marketingPageFrameMock, marketingPageShellMock } = vi.hoisted(() => ({
  marketingPageFrameMock: vi.fn(
    ({ children }: { children?: React.ReactNode }) => (
      <div data-page-frame="1">{children}</div>
    )
  ),
  marketingPageShellMock: vi.fn(
    ({ children }: { children?: React.ReactNode }) => (
      <div data-page-shell="1">{children}</div>
    )
  ),
}));

vi.mock("@/components/marketing/page-shell", () => ({
  MarketingPageFrame: marketingPageFrameMock,
  MarketingPageShell: marketingPageShellMock,
}));

import TermsPage, { dynamic, metadata } from "./page";

describe("terms page contract", () => {
  it("keeps route metadata aligned and static", () => {
    expect(metadata.title).toBe("Terms of Service — Avenire");
    expect(dynamic).toBe("force-static");
  });

  it("renders a single terms h1 with the public legal copy", () => {
    const html = renderToStaticMarkup(<TermsPage />);
    const h1Count = (html.match(/<h1/g) ?? []).length;

    expect(marketingPageShellMock).toHaveBeenCalledTimes(1);
    expect(marketingPageFrameMock).toHaveBeenCalledTimes(1);
    expect(html).toContain('data-page-shell="1"');
    expect(html).toContain('data-page-frame="1"');
    expect(h1Count).toBe(1);
    expect(html).toContain(">Terms of Service</h1>");
    expect(html).toContain(
      "These terms explain the basic rules for using Avenire."
    );
  });
});
