import { describe, expect, it } from "vitest";
import {
  buildCommandPaletteFileTargetRoute,
  buildCommandPaletteMethodValue,
  buildCommandPaletteMindsetSetValue,
  buildCommandPaletteRecentMethodValue,
  buildCommandPaletteRecentMindsetSetValue,
  getCommandPaletteTasksState,
  resolveCommandPaletteWorkspaceFilesRoute,
  shouldReplaceCommandPaletteFileRoute,
} from "./command-palette-model";

describe("command palette model", () => {
  it("keeps command palette task loading failure distinct from an absent task group", () => {
    expect(
      getCommandPaletteTasksState({
        loadFailed: true,
        taskCount: 0,
      })
    ).toEqual({
      message: "Unable to load tasks.",
      showGroup: true,
    });

    expect(
      getCommandPaletteTasksState({
        loadFailed: false,
        taskCount: 0,
      })
    ).toEqual({
      message: null,
      showGroup: false,
    });

    expect(
      getCommandPaletteTasksState({
        loadFailed: false,
        taskCount: 2,
      })
    ).toEqual({
      message: null,
      showGroup: true,
    });
  });

  it("keeps command palette file routing explicit", () => {
    const workspaces = [
      {
        name: "Workspace One",
        organizationId: "org-1",
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
      {
        name: "Workspace Two",
        organizationId: "org-2",
        rootFolderId: "root-2",
        workspaceId: "workspace-2",
      },
    ];

    expect(
      resolveCommandPaletteWorkspaceFilesRoute({
        workspaceId: "workspace-1",
        workspaces,
      })
    ).toBe("/workspace/files/workspace-1/folder/root-1");
    expect(
      resolveCommandPaletteWorkspaceFilesRoute({
        workspaceId: "missing-workspace",
        workspaces,
      })
    ).toBe("/workspace/files");

    expect(
      buildCommandPaletteFileTargetRoute({
        fileId: "file-1",
        folderId: "folder-1",
        retrievalChunkId: "chunk-1",
        workspaceId: "workspace-1",
      })
    ).toBe(
      "/workspace/files/workspace-1/folder/folder-1?file=file-1&retrievalChunk=chunk-1"
    );

    expect(
      shouldReplaceCommandPaletteFileRoute({
        currentFilesFolderId: "folder-1",
        currentFilesWorkspaceUuid: "workspace-1",
        folderId: "folder-1",
        workspaceId: "workspace-1",
      })
    ).toBe(true);
    expect(
      shouldReplaceCommandPaletteFileRoute({
        currentFilesFolderId: "folder-1",
        currentFilesWorkspaceUuid: "workspace-1",
        folderId: "folder-2",
        workspaceId: "workspace-1",
      })
    ).toBe(false);
  });

  it("keeps Methods and Mindset Sets discoverable under both product and generic search terms", () => {
    expect(
      buildCommandPaletteMethodValue({
        description: "Recent study session",
        label: "Gauss Law",
      })
    ).toBe("Gauss Law Recent study session method chat");

    expect(
      buildCommandPaletteMindsetSetValue({
        description: "Electrostatics review",
        label: "Chapter 1",
      })
    ).toBe("Chapter 1 Electrostatics review mindset set flashcard");

    expect(
      buildCommandPaletteRecentMethodValue({
        slug: "gauss-law",
        title: "Gauss Law",
      })
    ).toBe("Gauss Law gauss-law method chat");

    expect(
      buildCommandPaletteRecentMindsetSetValue({
        id: "set-1",
        title: "Electrostatics",
      })
    ).toBe("Electrostatics set-1 mindset set flashcard");
  });
});
