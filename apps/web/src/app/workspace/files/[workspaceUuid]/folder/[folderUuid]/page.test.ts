import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";

const { workspaceFolderRoutePageClientMock, workspaceRoutePlaceholderMock } =
  vi.hoisted(() => ({
    workspaceFolderRoutePageClientMock: vi.fn(() => null),
    workspaceRoutePlaceholderMock: vi.fn(() => null),
  }));

vi.mock("@/components/dashboard/workspace-route-placeholder", () => ({
  WorkspaceRoutePlaceholder: workspaceRoutePlaceholderMock,
}));

vi.mock("@/components/files/workspace-folder-route-page-client", () => ({
  WorkspaceFolderRoutePageClient: workspaceFolderRoutePageClientMock,
}));

import WorkspaceFolderPage, { dynamic, metadata } from "./page";

describe("WorkspaceFolderPage", () => {
  it("keeps the route explicitly request-driven", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("uses the static Files title", () => {
    expect(metadata.title).toBe("Files — Avenire");
    expect(metadata.robots).toEqual({ follow: false, index: false });
  });

  it("passes explicit route params into the client page", async () => {
    const element = await WorkspaceFolderPage({
      params: Promise.resolve({
        folderUuid: "folder-1",
        workspaceUuid: "workspace-1",
      }),
    });

    expect(element.type).toBe(Suspense);
    expect(element.props.children.type).toBe(
      workspaceFolderRoutePageClientMock
    );
    expect(element.props.children.props).toEqual({
      folderUuid: "folder-1",
      workspaceUuid: "workspace-1",
    });
  });
});
