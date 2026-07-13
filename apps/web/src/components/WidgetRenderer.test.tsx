// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import {
  buildCanvasWidgetDocument,
  CANVAS_WIDGET_ALLOWED_SCRIPT_ORIGINS,
  CANVAS_WIDGET_CSP,
  CANVAS_WIDGET_SANDBOX,
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
