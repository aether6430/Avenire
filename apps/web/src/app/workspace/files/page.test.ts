import { describe, expect, it, vi } from "vitest";

const { workspaceFilesRootPageClientMock } = vi.hoisted(() => ({
  workspaceFilesRootPageClientMock: vi.fn(() => null),
}));

vi.mock("@/components/files/workspace-files-root-page-client", () => ({
  WorkspaceFilesRootPageClient: workspaceFilesRootPageClientMock,
}));

import WorkspaceFilesPage, { metadata } from "./page";

describe("WorkspaceFilesPage", () => {
  it("keeps page metadata aligned to the files surface", () => {
    expect(metadata.title).toBe("Files — Avenire");
    expect(metadata.robots).toEqual({ follow: false, index: false });
  });

  it("renders the shared files root page client with no preferred workspace override", () => {
    const element = WorkspaceFilesPage();

    expect(element.type).toBe(workspaceFilesRootPageClientMock);
    expect(element.props).toEqual({});
  });
});
