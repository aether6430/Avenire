import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { readFileSyncMock } = vi.hoisted(() => ({
  readFileSyncMock: vi.fn(),
}));

vi.mock("node:fs", () => ({
  default: {
    readFileSync: readFileSyncMock,
  },
}));

vi.mock("@/components/marketing/page-shell", () => ({
  MarketingPageShell: ({ children }: { children: ReactNode }) =>
    createElement("div", { "data-marketing-shell": "1" }, children),
  MarketingPageFrame: ({ children }: { children: ReactNode }) =>
    createElement("div", { "data-marketing-frame": "1" }, children),
}));

import AboutPage, { dynamic, metadata } from "./page";

describe("about page contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readFileSyncMock.mockReturnValue("# Why Avenire Exists\n\nStudy deeply.");
  });

  it("keeps the about page force-static and renders the vision markdown inside the marketing shell", () => {
    const html = renderToStaticMarkup(<AboutPage />);

    expect(dynamic).toBe("force-static");
    expect(metadata.title).toBe("Why Avenire Exists — Avenire");
    expect(metadata.description).toBe(
      "Learn what Avenire is building and why we think AI should deepen understanding instead of replacing it."
    );
    expect(readFileSyncMock).toHaveBeenCalledTimes(1);
    expect(html).toContain('data-marketing-shell="1"');
    expect(html).toContain('data-marketing-frame="1"');
    expect(html).toContain(">About<");
    expect(html).toContain("Why Avenire Exists");
    expect(html).toContain("Study deeply.");
  });
});
