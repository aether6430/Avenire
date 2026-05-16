import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ExtensionSuccessPage, { dynamic, metadata } from "./page";

describe("extension success page contract", () => {
  it("keeps route metadata aligned and request-driven", () => {
    expect(metadata.title).toBe("Web Clipper Connected — Avenire");
    expect(dynamic).toBe("force-dynamic");
  });

  it("renders a product-facing success message", () => {
    const html = renderToStaticMarkup(<ExtensionSuccessPage />);

    expect(html).toContain(">Web Clipper Connected</h1>");
    expect(html).toContain(
      "The Avenire Web Clipper can use your session now. Return to the page you were clipping and keep going."
    );
  });
});
