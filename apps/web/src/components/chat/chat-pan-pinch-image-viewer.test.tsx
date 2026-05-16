import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ChatPanPinchImageViewer } from "./chat-pan-pinch-image-viewer";

vi.mock("@avenire/ui/components/button", () => ({
  Button: ({
    "aria-label": ariaLabel,
    children,
  }: {
    "aria-label"?: string;
    children?: ReactNode;
  }) => <button aria-label={ariaLabel}>{children}</button>,
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span data-alt={alt} />,
}));

vi.mock("@/components/files/use-pan-pinch-image-viewer", () => ({
  usePanPinchImageViewer: () => ({
    containerRef: { current: null },
    handlePointerDown: () => {},
    handlePointerMove: () => {},
    handlePointerUp: () => {},
    handleWheel: () => {},
    isDragging: false,
    resetView: () => {},
    transform: { scale: 1, x: 0, y: 0 },
    zoomIn: () => {},
    zoomOut: () => {},
  }),
}));

describe("ChatPanPinchImageViewer", () => {
  it("names the icon-only zoom controls explicitly", () => {
    const html = renderToStaticMarkup(
      <ChatPanPinchImageViewer alt="Preview" src="/preview.png" />
    );

    expect(html).toContain('aria-label="Zoom out"');
    expect(html).toContain('aria-label="Reset zoom"');
    expect(html).toContain('aria-label="Zoom in"');
  });
});
