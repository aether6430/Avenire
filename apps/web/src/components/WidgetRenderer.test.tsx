// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import {
  buildCanvasWidgetDocument,
  buildCssVarBlock,
  buildFallbackThemeBlock,
  CANVAS_THEME_VAR_NAMES,
  CANVAS_WIDGET_ALLOWED_SCRIPT_ORIGINS,
  CANVAS_WIDGET_CSP,
  CANVAS_WIDGET_SANDBOX,
  extractThemeVars,
  normalizeCssColorValue,
} from "./WidgetRenderer";

describe("canvas widget isolation", () => {
  it("keeps widget scripts in an opaque-origin iframe sandbox", () => {
    expect(CANVAS_WIDGET_SANDBOX).toBe("allow-scripts");
    expect(CANVAS_WIDGET_SANDBOX).not.toContain("allow-same-origin");
    expect(CANVAS_WIDGET_SANDBOX).not.toContain("allow-top-navigation");
  });

  it("allows only the approved script CDNs in the iframe policy", () => {
    for (const origin of CANVAS_WIDGET_ALLOWED_SCRIPT_ORIGINS) {
      expect(CANVAS_WIDGET_CSP).toContain(origin);
    }
    expect(CANVAS_WIDGET_CSP).toContain("script-src 'unsafe-inline'");
    expect(CANVAS_WIDGET_CSP).not.toContain("https://attacker.example");
    expect(CANVAS_WIDGET_CSP).toContain("connect-src 'none'");
  });

  it("copies inline canvas code before inserting its executable script", () => {
    const document = buildCanvasWidgetDocument(":root {}", false);
    const copyInlineCodeAt = document.indexOf(
      "s.textContent = old.textContent;"
    );
    const insertScriptAt = document.indexOf("parent.replaceChild(s, old);");

    expect(copyInlineCodeAt).toBeGreaterThan(-1);
    expect(insertScriptAt).toBeGreaterThan(copyInlineCodeAt);
  });
});

describe("canvas widget theme colors", () => {
  it("normalizes 8-digit hex colors to rgba for Android-safe injection", () => {
    expect(normalizeCssColorValue("#e4e4e4eb")).toBe(
      "rgba(228, 228, 228, 0.922)"
    );
    expect(normalizeCssColorValue("#141414f0")).toBe("rgba(20, 20, 20, 0.941)");
    expect(normalizeCssColorValue("#abc4ff")).toBe("#abc4ff");
    expect(normalizeCssColorValue("  rgba(1, 2, 3, 0.5) ")).toBe(
      "rgba(1, 2, 3, 0.5)"
    );
  });

  it("serializes host vars with normalized color values", () => {
    const block = buildCssVarBlock({
      "--foreground": "#e4e4e4eb",
      "--background": "#141414",
    });

    expect(block).toContain("--foreground: rgba(228, 228, 228, 0.922);");
    expect(block).toContain("--background: #141414;");
    expect(block).not.toContain("#e4e4e4eb");
  });

  it("embeds concrete dark/light fallbacks and matching color-scheme", () => {
    const darkDoc = buildCanvasWidgetDocument(":root { --x: 1; }", true);
    const lightDoc = buildCanvasWidgetDocument(":root { --x: 1; }", false);

    expect(darkDoc).toContain('class="dark"');
    expect(darkDoc).toContain('name="color-scheme" content="dark"');
    expect(darkDoc).toContain("color-scheme: dark;");
    expect(darkDoc).toContain("forced-color-adjust: none");
    expect(darkDoc).toContain(buildFallbackThemeBlock(true));
    expect(darkDoc).toContain("--color-bg-blue: #364954;");
    expect(darkDoc).toContain("--foreground: rgba(228, 228, 228, 0.92);");
    expect(darkDoc).not.toContain("color-mix(in oklch");

    expect(lightDoc).toContain('content="light"');
    expect(lightDoc).toContain("color-scheme: light;");
    expect(lightDoc).toContain(buildFallbackThemeBlock(false));
    expect(lightDoc).toContain("--color-bg-blue: #ddebf1;");
  });

  it("reads explicit theme tokens even when style iteration is empty", () => {
    document.documentElement.style.setProperty("--foreground", "#e4e4e4eb");
    document.documentElement.style.setProperty("--background", "#141414");
    document.documentElement.style.setProperty("--color-bg-blue", "#364954");

    const originalLength = Object.getOwnPropertyDescriptor(
      CSSStyleDeclaration.prototype,
      "length"
    );
    Object.defineProperty(CSSStyleDeclaration.prototype, "length", {
      configurable: true,
      get() {
        return 0;
      },
    });

    try {
      const vars = extractThemeVars();
      expect(CANVAS_THEME_VAR_NAMES).toContain("--foreground");
      expect(vars["--foreground"]).toBe("rgba(228, 228, 228, 0.922)");
      expect(vars["--background"]).toBe("#141414");
      expect(vars["--color-bg-blue"]).toBe("#364954");
    } finally {
      if (originalLength) {
        Object.defineProperty(
          CSSStyleDeclaration.prototype,
          "length",
          originalLength
        );
      }
      document.documentElement.style.removeProperty("--foreground");
      document.documentElement.style.removeProperty("--background");
      document.documentElement.style.removeProperty("--color-bg-blue");
    }
  });
});
