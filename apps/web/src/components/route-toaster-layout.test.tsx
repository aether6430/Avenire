import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { toasterMock } = vi.hoisted(() => ({
  toasterMock: vi.fn(() => <div data-toaster="1" />),
}));

vi.mock("@avenire/ui/components/sonner", () => ({
  Toaster: toasterMock,
}));

import { RouteToasterLayout } from "@/components/route-toaster-layout";

describe("RouteToasterLayout", () => {
  it("renders children and a single shared toaster surface", () => {
    const html = renderToStaticMarkup(
      <RouteToasterLayout>
        <div data-child="1" />
      </RouteToasterLayout>
    );

    expect(toasterMock).toHaveBeenCalledTimes(1);
    expect(html).toContain('data-child="1"');
    expect(html).toContain('data-toaster="1"');
  });
});
