"use client";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getMarkdownSizeClasses } from "@/components/chat/markdown-model";
import {
  createMarkdownComponents,
  transformMarkdownUrl,
} from "@/components/chat/markdown-renderers";

describe("markdown renderers", () => {
  it("renders workspace-file links through the local workspace link owner", () => {
    const components = createMarkdownComponents({
      sizeClasses: getMarkdownSizeClasses("default"),
      workspaceUuid: "workspace-1",
    });

    const html = renderToStaticMarkup(
      components.a({
        children: "Spec",
        href: "workspace-file://folder/My note.md",
      })
    );

    expect(html).toContain("Source");
    expect(html).toContain("Spec");
  });

  it("keeps workspace-file urls untouched while normalizing external links", () => {
    expect(transformMarkdownUrl("workspace-file://folder/My note.md")).toBe(
      "workspace-file://folder/My note.md"
    );
    expect(transformMarkdownUrl("https://example.com")).toBe(
      "https://example.com"
    );
  });
});
