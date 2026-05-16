import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";

const { workspaceOverviewPageClientMock, workspaceRoutePlaceholderMock } =
  vi.hoisted(() => ({
    workspaceOverviewPageClientMock: vi.fn(() => null),
    workspaceRoutePlaceholderMock: vi.fn(() => null),
  }));

vi.mock("@/components/dashboard/workspace-overview-page-client", () => ({
  WorkspaceOverviewPageClient: workspaceOverviewPageClientMock,
}));

vi.mock("@/components/dashboard/workspace-route-placeholder", () => ({
  WorkspaceRoutePlaceholder: workspaceRoutePlaceholderMock,
}));

import WorkspacePage, { metadata } from "./page";

describe("WorkspacePage", () => {
  it("keeps page metadata aligned to the workspace surface", () => {
    expect(metadata.title).toBe("Workspace — Avenire");
  });

  it("renders the workspace overview client behind a loading fallback", () => {
    const element = WorkspacePage();

    expect(element.type).toBe(Suspense);
    expect(element.props.children.type).toBe(workspaceOverviewPageClientMock);
    expect(element.props.fallback.type).toBe(workspaceRoutePlaceholderMock);
    expect(element.props.fallback.props).toEqual({
      label: "Loading workspace...",
    });
  });
});
