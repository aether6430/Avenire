import { describe, expect, it } from "vitest";
import {
  buildWorkspaceBrowseCollectionFromIndexes,
  buildWorkspaceBrowseRecentItems,
  buildWorkspaceRetrievalSearchItems,
} from "@/lib/workspace-browse-model";

describe("workspace browse model", () => {
  const workspaces = [
    { name: "Alpha", workspaceId: "workspace-a" },
    { name: "Beta", workspaceId: "workspace-b" },
  ];

  const fileIndexByWorkspace = {
    "workspace-a": {
      files: [
        { folderId: "folder-a", id: "file-a", name: "Welcome.md" },
        { folderId: "folder-a", id: "file-b", name: "Roadmap.pdf" },
      ],
      folders: [
        { id: "root-a", name: "Workspace", parentId: null },
        { id: "folder-a", name: "Docs", parentId: "root-a" },
      ],
    },
    "workspace-b": {
      files: [{ folderId: "folder-b", id: "file-c", name: "Inbox.md" }],
      folders: [
        { id: "root-b", name: "Workspace", parentId: null },
        { id: "folder-b", name: "Shared", parentId: "root-b" },
      ],
    },
  };

  it("builds stable browse items with workspace-aware file and folder paths", () => {
    expect(
      buildWorkspaceBrowseCollectionFromIndexes({
        fileIndexByWorkspace,
        workspaces,
      })
    ).toEqual({
      files: [
        {
          folderId: "folder-a",
          id: "file-b",
          name: "Roadmap.pdf",
          path: "Docs/Roadmap.pdf",
          type: "file",
          workspaceName: "Alpha",
          workspaceUuid: "workspace-a",
        },
        {
          folderId: "folder-a",
          id: "file-a",
          name: "Welcome.md",
          path: "Docs/Welcome.md",
          type: "file",
          workspaceName: "Alpha",
          workspaceUuid: "workspace-a",
        },
        {
          folderId: "folder-b",
          id: "file-c",
          name: "Inbox.md",
          path: "Shared/Inbox.md",
          type: "file",
          workspaceName: "Beta",
          workspaceUuid: "workspace-b",
        },
      ],
      folders: [
        {
          id: "root-a",
          name: "Workspace",
          path: "Workspace",
          type: "folder",
          workspaceName: "Alpha",
          workspaceUuid: "workspace-a",
        },
        {
          id: "folder-a",
          name: "Docs",
          path: "Docs",
          type: "folder",
          workspaceName: "Alpha",
          workspaceUuid: "workspace-a",
        },
        {
          id: "root-b",
          name: "Workspace",
          path: "Workspace",
          type: "folder",
          workspaceName: "Beta",
          workspaceUuid: "workspace-b",
        },
        {
          id: "folder-b",
          name: "Shared",
          path: "Shared",
          type: "folder",
          workspaceName: "Beta",
          workspaceUuid: "workspace-b",
        },
      ],
    });
  });

  it("builds recent browse items in recorded order and respects workspace filters", () => {
    const { files } = buildWorkspaceBrowseCollectionFromIndexes({
      fileIndexByWorkspace,
      workspaces,
    });

    expect(
      buildWorkspaceBrowseRecentItems({
        fileItems: files,
        recentFileIdsByWorkspace: {
          "workspace-a": ["file-b", "file-a"],
          "workspace-b": ["file-c"],
        },
        targetWorkspaceIds: ["workspace-a"],
      })
    ).toEqual([
      {
        folderId: "folder-a",
        id: "file-b",
        name: "Roadmap.pdf",
        path: "Docs/Roadmap.pdf",
        type: "file",
        workspaceName: "Alpha",
        workspaceUuid: "workspace-a",
      },
      {
        folderId: "folder-a",
        id: "file-a",
        name: "Welcome.md",
        path: "Docs/Welcome.md",
        type: "file",
        workspaceName: "Alpha",
        workspaceUuid: "workspace-a",
      },
    ]);
  });

  it("builds retrieval search items from browse files for one workspace", () => {
    const { files } = buildWorkspaceBrowseCollectionFromIndexes({
      fileIndexByWorkspace,
      workspaces,
    });

    expect(
      buildWorkspaceRetrievalSearchItems({
        fileItems: files,
        workspaceUuid: "workspace-a",
      })
    ).toEqual([
      {
        description: "Alpha",
        folderId: "folder-a",
        id: "file-b",
        path: "Docs/Roadmap.pdf",
        snippet: "Match in file content",
        title: "Roadmap.pdf",
        type: "file",
        workspaceUuid: "workspace-a",
      },
      {
        description: "Alpha",
        folderId: "folder-a",
        id: "file-a",
        path: "Docs/Welcome.md",
        snippet: "Match in file content",
        title: "Welcome.md",
        type: "file",
        workspaceUuid: "workspace-a",
      },
    ]);
  });
});
