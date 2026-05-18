import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  handleWorkspaceFileShareGrantsPostMock,
  handleWorkspaceFileShareLinkPostMock,
  handleWorkspaceFolderShareGrantsPostMock,
  handleWorkspaceFolderShareLinkPostMock,
  resolveWorkspaceFileShareRouteContextMock,
  resolveWorkspaceFolderShareRouteContextMock,
} = vi.hoisted(() => ({
  handleWorkspaceFileShareGrantsPostMock: vi.fn(),
  handleWorkspaceFileShareLinkPostMock: vi.fn(),
  handleWorkspaceFolderShareGrantsPostMock: vi.fn(),
  handleWorkspaceFolderShareLinkPostMock: vi.fn(),
  resolveWorkspaceFileShareRouteContextMock: vi.fn(),
  resolveWorkspaceFolderShareRouteContextMock: vi.fn(),
}));

vi.mock("../files/[fileUuid]/share/workspace-file-share-route-context", () => ({
  resolveWorkspaceFileShareRouteContext:
    resolveWorkspaceFileShareRouteContextMock,
}));

vi.mock(
  "../files/[fileUuid]/share/grants/workspace-file-share-grants-post",
  () => ({
    handleWorkspaceFileShareGrantsPost: handleWorkspaceFileShareGrantsPostMock,
  })
);

vi.mock(
  "../files/[fileUuid]/share/link/workspace-file-share-link-post",
  () => ({
    handleWorkspaceFileShareLinkPost: handleWorkspaceFileShareLinkPostMock,
  })
);

vi.mock(
  "../folders/[folderUuid]/share/workspace-folder-share-route-context",
  () => ({
    resolveWorkspaceFolderShareRouteContext:
      resolveWorkspaceFolderShareRouteContextMock,
  })
);

vi.mock(
  "../folders/[folderUuid]/share/grants/workspace-folder-share-grants-post",
  () => ({
    handleWorkspaceFolderShareGrantsPost:
      handleWorkspaceFolderShareGrantsPostMock,
  })
);

vi.mock(
  "../folders/[folderUuid]/share/link/workspace-folder-share-link-post",
  () => ({
    handleWorkspaceFolderShareLinkPost: handleWorkspaceFolderShareLinkPostMock,
  })
);

import { POST as postFileGrants } from "../files/[fileUuid]/share/grants/route";
import { POST as postFileLink } from "../files/[fileUuid]/share/link/route";
import { POST as postFolderGrants } from "../folders/[folderUuid]/share/grants/route";
import { POST as postFolderLink } from "../folders/[folderUuid]/share/link/route";

describe("workspace file and folder share routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveWorkspaceFileShareRouteContextMock.mockResolvedValue({
      apiLogger: {},
      file: { id: "file-1" },
      fileUuid: "file-1",
      user: { id: "user-1" },
      workspaceUuid: "workspace-1",
    });
    resolveWorkspaceFolderShareRouteContextMock.mockResolvedValue({
      apiLogger: {},
      folder: { folder: { id: "folder-1" } },
      folderUuid: "folder-1",
      user: { id: "user-1" },
      workspaceUuid: "workspace-1",
    });
    handleWorkspaceFileShareGrantsPostMock.mockResolvedValue(
      Response.json({ grant: true })
    );
    handleWorkspaceFileShareLinkPostMock.mockResolvedValue(
      Response.json({ link: true })
    );
    handleWorkspaceFolderShareGrantsPostMock.mockResolvedValue(
      Response.json({ grant: true })
    );
    handleWorkspaceFolderShareLinkPostMock.mockResolvedValue(
      Response.json({ link: true })
    );
  });

  it("returns early context responses for file and folder share routes", async () => {
    resolveWorkspaceFileShareRouteContextMock.mockResolvedValueOnce({
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    });
    const fileResponse = await postFileLink(
      new Request("https://avenire.space"),
      {
        params: Promise.resolve({
          fileUuid: "file-1",
          workspaceUuid: "workspace-1",
        }),
      }
    );
    expect(fileResponse.status).toBe(403);

    resolveWorkspaceFolderShareRouteContextMock.mockResolvedValueOnce({
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    });
    const folderResponse = await postFolderGrants(
      new Request("https://avenire.space"),
      {
        params: Promise.resolve({
          folderUuid: "folder-1",
          workspaceUuid: "workspace-1",
        }),
      }
    );
    expect(folderResponse.status).toBe(403);
  });

  it("delegates file and folder share routes through their resolved contexts", async () => {
    const request = new Request("https://avenire.space");
    const fileContext = {
      params: Promise.resolve({
        fileUuid: "file-1",
        workspaceUuid: "workspace-1",
      }),
    };
    const folderContext = {
      params: Promise.resolve({
        folderUuid: "folder-1",
        workspaceUuid: "workspace-1",
      }),
    };

    const fileGrants = await postFileGrants(request, fileContext);
    const fileLink = await postFileLink(request, fileContext);
    const folderGrants = await postFolderGrants(request, folderContext);
    const folderLink = await postFolderLink(request, folderContext);

    expect(handleWorkspaceFileShareGrantsPostMock).toHaveBeenCalledWith({
      apiLogger: {},
      file: { id: "file-1" },
      fileUuid: "file-1",
      request,
      user: { id: "user-1" },
      workspaceUuid: "workspace-1",
    });
    expect(handleWorkspaceFileShareLinkPostMock).toHaveBeenCalledWith({
      apiLogger: {},
      file: { id: "file-1" },
      fileUuid: "file-1",
      request,
      user: { id: "user-1" },
      workspaceUuid: "workspace-1",
    });
    expect(handleWorkspaceFolderShareGrantsPostMock).toHaveBeenCalledWith({
      apiLogger: {},
      folder: { folder: { id: "folder-1" } },
      folderUuid: "folder-1",
      request,
      user: { id: "user-1" },
      workspaceUuid: "workspace-1",
    });
    expect(handleWorkspaceFolderShareLinkPostMock).toHaveBeenCalledWith({
      apiLogger: {},
      folder: { folder: { id: "folder-1" } },
      folderUuid: "folder-1",
      request,
      user: { id: "user-1" },
      workspaceUuid: "workspace-1",
    });

    await expect(fileGrants.json()).resolves.toEqual({ grant: true });
    await expect(fileLink.json()).resolves.toEqual({ link: true });
    await expect(folderGrants.json()).resolves.toEqual({ grant: true });
    await expect(folderLink.json()).resolves.toEqual({ link: true });
  });
});
