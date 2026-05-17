"use client";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  Reasoning,
  ReasoningAction,
  ReasoningContent,
  ReasoningTrigger,
  RollingStatusHeader,
} from "@/components/chat/rolling-reasoning";

describe("rolling reasoning", () => {
  it("renders a non-streaming reasoning action with ready summary", () => {
    const html = renderToStaticMarkup(
      <ReasoningAction content={"Step one\nStep two"} isStreaming={false} />
    );

    expect(html).toContain("Reasoning");
    expect(html).toContain("ready");
    expect(html).toContain("Step one");
    expect(html).toContain("Step two");
  });

  it("renders provider-backed trigger detail from the supplied duration", () => {
    const html = renderToStaticMarkup(
      <Reasoning duration={3}>
        <ReasoningTrigger />
        <ReasoningContent>Line one</ReasoningContent>
      </Reasoning>
    );

    expect(html).toContain("Reasoning");
    expect(html).toContain("took 3 seconds");
    expect(html).toContain("Line one");
  });

  it("renders the running status header path", () => {
    const html = renderToStaticMarkup(
      <RollingStatusHeader done={false} summary="running" title="Exploring" />
    );

    expect(html).toContain("Exploring");
    expect(html).toContain("running");
  });
});
