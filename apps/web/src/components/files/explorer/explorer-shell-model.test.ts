import { describe, expect, it } from "vitest";
import {
  resolveExplorerRouteContext,
  resolveExplorerWorkspaceName,
} from "@/components/files/explorer/explorer-shell-model";

describe("Explorer shell model", () => {
  it("resolves route context from page props first, then falls back to pathname params", () => {
    expect(
      resolveExplorerRouteContext({
        folderUuidFromPage: "folder-page",
        pathname: "/workspace/files/workspace-route/folder/folder-route",
        workspaceUuidFromPage: "workspace-page",
      })
    ).toEqual({
      currentFolderId: "folder-page",
      workspaceUuid: "workspace-page",
    });

    expect(
      resolveExplorerRouteContext({
        folderUuidFromPage: undefined,
        pathname: "/workspace/files/workspace-route/folder/folder-route",
        workspaceUuidFromPage: undefined,
      })
    ).toEqual({
      currentFolderId: "folder-route",
      workspaceUuid: "workspace-route",
    });
  });

  it("resolves workspace name from cached or bootstrap workspaces", () => {
    expect(
      resolveExplorerWorkspaceName({
        bootstrapWorkspaces: [
          { name: "Bootstrap Workspace", workspaceId: "workspace-1" },
        ],
        cachedWorkspaces: [
          { name: "Cached Workspace", workspaceId: "workspace-1" },
        ],
        workspaceUuid: "workspace-1",
      })
    ).toBe("Cached Workspace");

    expect(
      resolveExplorerWorkspaceName({
        bootstrapWorkspaces: [
          { name: "Bootstrap Workspace", workspaceId: "workspace-2" },
        ],
        cachedWorkspaces: [],
        workspaceUuid: "workspace-2",
      })
    ).toBe("Bootstrap Workspace");

    expect(
      resolveExplorerWorkspaceName({
        bootstrapWorkspaces: [],
        cachedWorkspaces: [],
        workspaceUuid: "workspace-3",
      })
    ).toBeNull();
  });
});
