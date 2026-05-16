import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PrivacyPage, { dynamic, metadata } from "./page";

describe("privacy page contract", () => {
  it("keeps route metadata aligned and static", () => {
    expect(metadata.title).toBe("Privacy Policy — Avenire");
    expect(dynamic).toBe("force-static");
  });

  it("renders a single privacy-policy h1 from the legal markdown source", () => {
    const html = renderToStaticMarkup(<PrivacyPage />);
    const h1Count = (html.match(/<h1/g) ?? []).length;

    expect(h1Count).toBe(1);
    expect(html).toContain(">Privacy Policy</h1>");
  });
});
