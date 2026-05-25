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

import PrivacyPage, { dynamic, metadata } from "./page";

describe("privacy page contract", () => {
  it("keeps route metadata aligned and static", () => {
    expect(metadata.title).toBe("Privacy Policy — Avenire");
    expect(dynamic).toBe("force-static");
  });

  it("renders a single privacy-policy h1 from the legal markdown source", () => {
    const html = renderToStaticMarkup(<PrivacyPage />);
    const h1Count = (html.match(/<h1/g) ?? []).length;

    expect(marketingPageShellMock).toHaveBeenCalledTimes(1);
    expect(marketingPageFrameMock).toHaveBeenCalledTimes(1);
    expect(html).toContain('data-page-shell="1"');
    expect(html).toContain('data-page-frame="1"');
    expect(h1Count).toBe(1);
    expect(html).toContain(">Privacy Policy</h1>");
  });
});
