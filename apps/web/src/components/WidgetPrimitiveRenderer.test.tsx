// @vitest-environment happy-dom

import type { WidgetSpec } from "@avenire/ai/tools";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WidgetPrimitiveRenderer } from "./WidgetPrimitiveRenderer";

function htmlWidgetSpec(html: string): WidgetSpec {
  return {
    root: {
      html,
      type: "html",
    },
    type: "primitive",
  };
}

describe("WidgetPrimitiveRenderer html nodes", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
        widgetHtmlExecuted?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    (
      globalThis as typeof globalThis & { widgetHtmlExecuted?: boolean }
    ).widgetHtmlExecuted = undefined;

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  function renderHtml(html: string) {
    act(() => {
      root.render(<WidgetPrimitiveRenderer spec={htmlWidgetSpec(html)} />);
    });
  }

  it("removes script elements before they can execute", () => {
    renderHtml(
      "<p>Safe text</p><script>globalThis.widgetHtmlExecuted = true;</script>"
    );

    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("Safe text");
    expect(
      (globalThis as typeof globalThis & { widgetHtmlExecuted?: boolean })
        .widgetHtmlExecuted
    ).toBeUndefined();
  });

  it("removes inline event attributes and styles", () => {
    renderHtml(
      '<img alt="diagram" src="/diagram.png" onerror="globalThis.widgetHtmlExecuted = true" style="position:fixed"><p onclick="globalThis.widgetHtmlExecuted = true">Click target</p>'
    );

    const image = container.querySelector("img");
    const paragraph = container.querySelector("p");

    expect(image?.getAttribute("onerror")).toBeNull();
    expect(image?.getAttribute("style")).toBeNull();
    expect(paragraph?.getAttribute("onclick")).toBeNull();
    expect(paragraph?.getAttribute("style")).toBeNull();
  });

  it("removes javascript links and unsafe embedded URLs", () => {
    renderHtml(
      '<a href="javascript:alert(1)">Bad link</a><img alt="bad image" src="data:text/html,<script>alert(1)</script>"><svg><use href="javascript:alert(1)"></use></svg>'
    );

    const link = container.querySelector("a");
    const image = container.querySelector("img");

    expect(link?.getAttribute("href")).toBeNull();
    expect(image?.getAttribute("src")).toBeNull();
    expect(container.querySelector("use")).toBeNull();
  });

  it("removes active embedded and form elements", () => {
    renderHtml(
      '<iframe></iframe><form action="/x"><input name="answer"><button>Submit</button></form><object data="/x"></object><embed src="/x">'
    );

    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector("input")).toBeNull();
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector("object")).toBeNull();
    expect(container.querySelector("embed")).toBeNull();
  });

  it("keeps useful educational markup and sanitized SVG visible", () => {
    renderHtml(`
      <section>
        <h2>Binary search invariant</h2>
        <p><strong>Maintain</strong> a sorted search window.</p>
        <ul><li>Move left</li><li>Move right</li></ul>
        <pre><code>mid = (lo + hi) / 2</code></pre>
        <table>
          <thead><tr><th scope="col">Step</th><th scope="col">Window</th></tr></thead>
          <tbody><tr><td>1</td><td>[0, n)</td></tr></tbody>
        </table>
        <svg viewBox="0 0 100 20" aria-label="number line">
          <line x1="0" y1="10" x2="100" y2="10" stroke="currentColor" />
          <circle cx="50" cy="10" r="4" fill="currentColor" />
        </svg>
      </section>
    `);

    expect(container.querySelector("h2")?.textContent).toBe(
      "Binary search invariant"
    );
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.querySelector("table")?.textContent).toContain("Window");
    expect(container.querySelector("code")?.textContent).toContain("mid =");
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("circle")?.getAttribute("cx")).toBe("50");
  });

  it("adds noopener noreferrer to blank-target links", () => {
    renderHtml('<a href="/lesson" target="_blank">Open lesson</a>');

    const link = container.querySelector("a");

    expect(link?.getAttribute("href")).toBe("/lesson");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
