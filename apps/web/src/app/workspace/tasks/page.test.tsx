import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";

const { workspaceRoutePlaceholderMock, workspaceTasksPageClientMock } =
  vi.hoisted(() => ({
    workspaceRoutePlaceholderMock: vi.fn(() => null),
    workspaceTasksPageClientMock: vi.fn(() => null),
  }));

vi.mock("@/components/dashboard/workspace-route-placeholder", () => ({
  WorkspaceRoutePlaceholder: workspaceRoutePlaceholderMock,
}));

vi.mock("@/components/tasks/workspace-tasks-page-client", () => ({
  WorkspaceTasksPageClient: workspaceTasksPageClientMock,
}));

import WorkspaceTasksPage, { metadata } from "./page";

describe("WorkspaceTasksPage", () => {
  it("keeps page metadata aligned to the tasks surface", () => {
    expect(metadata.title).toBe("Tasks — Avenire");
  });

  it("renders the tasks client behind a loading fallback", () => {
    const element = WorkspaceTasksPage();

    expect(element.type).toBe(Suspense);
    expect(element.props.children.type).toBe(workspaceTasksPageClientMock);
    expect(element.props.fallback.type).toBe(workspaceRoutePlaceholderMock);
    expect(element.props.fallback.props).toEqual({
      label: "Loading tasks...",
    });
  });
});
