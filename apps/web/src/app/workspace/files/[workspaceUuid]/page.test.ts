import { describe, expect, it, vi } from "vitest";

const { workspaceFilesRootPageClientMock } = vi.hoisted(() => ({
  workspaceFilesRootPageClientMock: vi.fn(() => null),
}));

vi.mock("@/components/files/workspace-files-root-page-client", () => ({
  WorkspaceFilesRootPageClient: workspaceFilesRootPageClientMock,
}));

import WorkspaceFilesWorkspacePage, { metadata } from "./page";

describe("WorkspaceFilesWorkspacePage metadata", () => {
  it("uses the static Files title", () => {
    expect(metadata.title).toBe("Files — Avenire");
    expect(metadata.robots).toEqual({ follow: false, index: false });
  });
});

describe("WorkspaceFilesWorkspacePage route", () => {
  it("renders the shared files root page client with the preferred workspace override", async () => {
    const element = await WorkspaceFilesWorkspacePage({
      params: Promise.resolve({ workspaceUuid: "workspace-1" }),
    });

    expect(element.type).toBe(workspaceFilesRootPageClientMock);
    expect(element.props).toEqual({
      preferredWorkspaceUuid: "workspace-1",
    });
  });
});
