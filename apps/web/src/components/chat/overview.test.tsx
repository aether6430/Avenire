import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Overview } from "@/components/chat/overview";

describe("chat overview contract", () => {
  it("uses the product title as the only page-level heading and keeps the greeting secondary", () => {
    const html = renderToStaticMarkup(
      createElement(Overview, {
        title: "New Method",
        userName: "Dev User",
      })
    );

    expect(html).toContain("<h1");
    expect(html).toContain(">New Method<");
    expect(html).toContain(">Hey Dev User!<");
    expect(html).toContain("<p");
    expect(html).not.toContain(">Hey Dev User!</h1>");
  });
});
