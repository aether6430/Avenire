import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { WidgetPrimitiveRenderContentMock } = vi.hoisted(() => ({
  WidgetPrimitiveRenderContentMock: vi.fn(() => <div>WIDGET_PRIMITIVE</div>),
}));

vi.mock("@/components/widget-primitive-render-content", () => ({
  WidgetPrimitiveRenderContent: WidgetPrimitiveRenderContentMock,
}));

import { WidgetPrimitiveRenderContent } from "@/components/widget-primitive-render-content";

describe("WidgetPrimitiveRenderContent entry", () => {
  it("passes the widget spec through to the extracted content owner", () => {
    const spec = {
      root: {
        text: "Hello",
        type: "text",
      },
      title: "Widget",
    };

    const html = renderToStaticMarkup(
      <WidgetPrimitiveRenderContent spec={spec as never} />
    );

    expect(WidgetPrimitiveRenderContentMock).toHaveBeenCalledWith(
      { spec },
      undefined
    );
    expect(html).toContain("WIDGET_PRIMITIVE");
  });
});
