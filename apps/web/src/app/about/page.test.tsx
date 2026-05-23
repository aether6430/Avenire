import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { marketingPageFrameMock, marketingPageShellMock, readFileSyncMock } =
  vi.hoisted(() => ({
    marketingPageFrameMock: vi.fn(
      ({ children }: { children?: React.ReactNode }) =>
        createElement("div", { "data-page-frame": "1" }, children)
    ),
    marketingPageShellMock: vi.fn(
      ({ children }: { children?: React.ReactNode }) =>
        createElement("div", { "data-page-shell": "1" }, children)
    ),
    readFileSyncMock: vi.fn(),
  }));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    default: {
      ...("default" in actual && actual.default ? actual.default : {}),
      readFileSync: readFileSyncMock,
    },
  };
});

vi.mock("@/components/marketing/page-shell", () => ({
  MarketingPageFrame: marketingPageFrameMock,
  MarketingPageShell: marketingPageShellMock,
}));

import AboutPage, { dynamic, metadata } from "./page";

describe("about page contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readFileSyncMock.mockReturnValue("# Why Avenire Exists\n\nStudy deeply.");
  });

  it("keeps the about page force-static and renders the vision markdown inside the current marketing chrome", () => {
    const html = renderToStaticMarkup(<AboutPage />);

    expect(dynamic).toBe("force-static");
    expect(metadata.title).toBe("About — Avenire");
    expect(metadata.description).toBe(
      "Learn what Avenire is building and why we think AI should deepen understanding instead of replacing it."
    );
    expect(readFileSyncMock).toHaveBeenCalledTimes(1);
    expect(marketingPageShellMock).toHaveBeenCalledTimes(1);
    expect(marketingPageFrameMock).toHaveBeenCalledTimes(1);
    expect(html).toContain('data-page-shell="1"');
    expect(html).toContain('data-page-frame="1"');
    expect(html).toContain(">About<");
    expect(html).toContain("Why Avenire Exists");
    expect(html).toContain("Study deeply.");
  });

  it("keeps the marketing navbar on a server-safe static shell", () => {
    const navbarSource = readFileSync(
      path.resolve(
        import.meta.dirname,
        "../../components/marketing/navbar.tsx"
      ),
      "utf8"
    );
    const footerSource = readFileSync(
      path.resolve(
        import.meta.dirname,
        "../../components/marketing/footer.tsx"
      ),
      "utf8"
    );
    const logoSource = readFileSync(
      path.resolve(import.meta.dirname, "../../components/marketing/logo.tsx"),
      "utf8"
    );

    expect(navbarSource).not.toContain('"use client"');
    expect(navbarSource).not.toContain("dynamic(");
    expect(navbarSource).toContain('Button as="a"');
    expect(navbarSource).toContain('href="/login"');
    expect(navbarSource).toContain('href="/waitlist"');
    expect(footerSource).not.toContain('from "next/link"');
    expect(logoSource).not.toContain('from "next/link"');
  });
});
