import { describe, expect, it } from "vitest";
import {
  buildCanvasThemeBlock,
  buildCssVarBlock,
  buildIframeDocument,
} from "@/components/widget-renderer-model";

describe("widget renderer model", () => {
  it("serializes host css vars into a root block", () => {
    expect(
      buildCssVarBlock({
        "--background": "oklch(1 0 0)",
        "--foreground": "oklch(0 0 0)",
      })
    ).toContain("--background: oklch(1 0 0);");
  });

  it("builds themed iframe documents with bridge scripts and canvas vars", () => {
    const canvasBlock = buildCanvasThemeBlock(true);
    const documentHtml = buildIframeDocument(
      ":root { --background: white; }",
      true
    );

    expect(canvasBlock).toContain("--canvas-background");
    expect(canvasBlock).toContain("--canvas-grid-strong");

    expect(documentHtml).toContain('class="dark"');
    expect(documentHtml).toContain("window.sendMessage = function(text)");
    expect(documentHtml).toContain(
      "window._setContent = function(html, runScripts)"
    );
    expect(documentHtml).toContain("morphdom(root, target");
    expect(documentHtml).toContain(
      "window.parent.postMessage({ type: 'avenire:resize'"
    );
    expect(documentHtml).toContain("morphdom-umd.min.js");
  });
});
