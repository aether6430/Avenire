// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import {
  CANVAS_WIDGET_SANDBOX,
  sanitizeCanvasWidgetHtml,
} from "./WidgetRenderer";

describe("sanitizeCanvasWidgetHtml", () => {
  it("keeps widget scripts in an opaque-origin iframe sandbox", () => {
    expect(CANVAS_WIDGET_SANDBOX).toBe("allow-scripts");
    expect(CANVAS_WIDGET_SANDBOX).not.toContain("allow-same-origin");
    expect(CANVAS_WIDGET_SANDBOX).not.toContain("allow-top-navigation");
  });

  it("keeps canvas drawing scripts inside the sandbox payload", () => {
    const sanitized = sanitizeCanvasWidgetHtml(`
      <canvas id="chart"></canvas>
      <script>
        document.getElementById("chart").getContext("2d").fillRect(0, 0, 10, 10);
      </script>
    `);

    expect(sanitized).toContain('<canvas id="chart"></canvas>');
    expect(sanitized).toContain('getContext("2d")');
    expect(sanitized).toContain("<script>");
  });

  it("keeps approved CDN scripts for chart widgets", () => {
    const sanitized = sanitizeCanvasWidgetHtml(
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>'
    );

    expect(sanitized).toContain("https://cdnjs.cloudflare.com/");
  });

  it("removes document-escape and active embedding primitives", () => {
    const sanitized = sanitizeCanvasWidgetHtml(`
      <base href="https://attacker.example/">
      <iframe src="https://attacker.example/"></iframe>
      <object data="https://attacker.example/"></object>
      <embed src="https://attacker.example/">
      <form action="https://attacker.example/"><button>Send</button></form>
      <a href="javascript:alert(1)">Bad link</a>
    `);

    expect(sanitized).not.toMatch(/<(?:base|embed|form|iframe|object)\b/i);
    expect(sanitized).not.toContain("javascript:");
  });
});
