import { describe, expect, it } from "vitest";
import { buildIframeDocument } from "@/components/widget-renderer-iframe-document";
import {
  buildCanvasThemeBlock,
  buildCssVarBlock,
} from "@/components/widget-renderer-theme";

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
    expect(documentHtml).toContain("min-height: 100%");
    expect(documentHtml).toContain("overflow-x: auto");
    expect(documentHtml).toContain("overflow-y: hidden");
    expect(documentHtml).toContain("window.sendMessage = function(text)");
    expect(documentHtml).toContain(
      "window._setContent = function(html, runScripts)"
    );
    expect(documentHtml).toContain("morphdom(root, target");
    expect(documentHtml).toContain(
      "window.parent.postMessage({ type: 'avenire:resize'"
    );
    expect(documentHtml).toContain("morphdom-umd.min.js");
    expect(documentHtml).toContain("|| '#fcfcfc'");
    expect(documentHtml).toContain("|| '#141414f0'");
    expect(documentHtml).toContain("|| '#14141414'");
    expect(documentHtml).toContain("|| '#141414f0'");
    expect(documentHtml).not.toContain("|| '#ffffff'");
    expect(documentHtml).not.toContain("|| '#37352f'");
    expect(documentHtml).not.toContain("|| '#1b2733'");
    expect(documentHtml).not.toContain("|| '#fafafa'");
    expect(documentHtml).not.toContain("rgba(55, 53, 47, 0.09)");
  });
});
