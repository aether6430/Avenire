import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { spinnerMock } = vi.hoisted(() => ({
  spinnerMock: vi.fn(() => <svg data-spinner="1" />),
}));

vi.mock("@avenire/ui/components/spinner", () => ({
  Spinner: spinnerMock,
}));

import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";

describe("WorkspaceRoutePlaceholder", () => {
  it("renders the spinner for pending states", () => {
    const html = renderToStaticMarkup(
      <WorkspaceRoutePlaceholder label="Loading workspace..." />
    );

    expect(html).toContain('data-spinner="1"');
    expect(html).toContain("Loading workspace...");
  });

  it("omits the spinner for explicit non-pending states", () => {
    const html = renderToStaticMarkup(
      <WorkspaceRoutePlaceholder
        label="Create a workspace to continue."
        pending={false}
      />
    );

    expect(html).not.toContain('data-spinner="1"');
    expect(html).toContain("Create a workspace to continue.");
  });
});
