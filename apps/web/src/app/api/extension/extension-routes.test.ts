import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSessionUserMock,
  handleExtensionDestinationRouteDeleteMock,
  handleExtensionDestinationRoutePatchMock,
  handleExtensionDestinationsRouteGetMock,
  handleExtensionDestinationsRoutePostMock,
  handleExtensionMeRouteGetMock,
  handleExtensionWorkspaceFoldersRouteGetMock,
  handleExtensionWorkspacesRouteGetMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  handleExtensionDestinationRouteDeleteMock: vi.fn(),
  handleExtensionDestinationRoutePatchMock: vi.fn(),
  handleExtensionDestinationsRouteGetMock: vi.fn(),
  handleExtensionDestinationsRoutePostMock: vi.fn(),
  handleExtensionMeRouteGetMock: vi.fn(),
  handleExtensionWorkspaceFoldersRouteGetMock: vi.fn(),
  handleExtensionWorkspacesRouteGetMock: vi.fn(),
}));

vi.mock("@/lib/workspace", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("./me/extension-me-route-get", () => ({
  handleExtensionMeRouteGet: handleExtensionMeRouteGetMock,
}));

vi.mock("./workspaces/extension-workspaces-route-get", () => ({
  handleExtensionWorkspacesRouteGet: handleExtensionWorkspacesRouteGetMock,
}));

vi.mock(
  "./workspaces/[workspaceUuid]/folders/extension-workspace-folders-route-get",
  () => ({
    handleExtensionWorkspaceFoldersRouteGet:
      handleExtensionWorkspaceFoldersRouteGetMock,
  })
);

vi.mock("./destinations/extension-destinations-route-get", () => ({
  handleExtensionDestinationsRouteGet: handleExtensionDestinationsRouteGetMock,
}));

vi.mock("./destinations/extension-destinations-route-post", () => ({
  handleExtensionDestinationsRoutePost:
    handleExtensionDestinationsRoutePostMock,
}));

vi.mock("./destinations/[id]/extension-destination-route-patch", () => ({
  handleExtensionDestinationRoutePatch:
    handleExtensionDestinationRoutePatchMock,
}));

vi.mock("./destinations/[id]/extension-destination-route-delete", () => ({
  handleExtensionDestinationRouteDelete:
    handleExtensionDestinationRouteDeleteMock,
}));

import { DELETE, PATCH } from "./destinations/[id]/route";
import {
  GET as getDestinations,
  POST as postDestination,
} from "./destinations/route";
import { GET as getMe } from "./me/route";
import { GET as getWorkspaceFolders } from "./workspaces/[workspaceUuid]/folders/route";
import { GET as getWorkspaces } from "./workspaces/route";

describe("extension routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserMock.mockResolvedValue({ id: "user-1", name: "Owner" });
    handleExtensionMeRouteGetMock.mockResolvedValue(
      Response.json({ user: { id: "user-1" } })
    );
    handleExtensionWorkspacesRouteGetMock.mockResolvedValue(
      Response.json({ workspaces: [] })
    );
    handleExtensionWorkspaceFoldersRouteGetMock.mockResolvedValue(
      Response.json({ folders: [] })
    );
    handleExtensionDestinationsRouteGetMock.mockResolvedValue(
      Response.json({ destinations: [] })
    );
    handleExtensionDestinationsRoutePostMock.mockResolvedValue(
      Response.json({ destination: { id: "preset-1" } }, { status: 201 })
    );
    handleExtensionDestinationRoutePatchMock.mockResolvedValue(
      Response.json({ destination: { id: "preset-1" } })
    );
    handleExtensionDestinationRouteDeleteMock.mockResolvedValue(
      new Response(null, { status: 204 })
    );
  });

  it("fails closed with unauthorized responses before delegating", async () => {
    getSessionUserMock.mockResolvedValueOnce(null);

    const response = await getMe();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized",
    });
    expect(handleExtensionMeRouteGetMock).not.toHaveBeenCalled();
  });

  it("delegates extension route wrappers through their dedicated handlers", async () => {
    const request = new Request("https://avenire.space");
    const params = Promise.resolve({ workspaceUuid: "workspace-1" });
    const destinationParams = Promise.resolve({ id: "preset-1" });

    const me = await getMe();
    const workspaces = await getWorkspaces();
    const folders = await getWorkspaceFolders(request, { params });
    const destinations = await getDestinations();
    const created = await postDestination(request);
    const patched = await PATCH(request, { params: destinationParams });
    const deleted = await DELETE(request, { params: destinationParams });

    expect(handleExtensionMeRouteGetMock).toHaveBeenCalledWith({
      user: { id: "user-1", name: "Owner" },
    });
    expect(handleExtensionWorkspacesRouteGetMock).toHaveBeenCalledWith({
      userId: "user-1",
    });
    expect(handleExtensionWorkspaceFoldersRouteGetMock).toHaveBeenCalledWith({
      request,
      userId: "user-1",
      workspaceUuid: "workspace-1",
    });
    expect(handleExtensionDestinationsRouteGetMock).toHaveBeenCalledWith({
      userId: "user-1",
    });
    expect(handleExtensionDestinationsRoutePostMock).toHaveBeenCalledWith({
      request,
      userId: "user-1",
    });
    expect(handleExtensionDestinationRoutePatchMock).toHaveBeenCalledWith({
      params: destinationParams,
      request,
      userId: "user-1",
    });
    expect(handleExtensionDestinationRouteDeleteMock).toHaveBeenCalledWith({
      params: destinationParams,
      userId: "user-1",
    });

    await expect(me.json()).resolves.toEqual({ user: { id: "user-1" } });
    await expect(workspaces.json()).resolves.toEqual({ workspaces: [] });
    await expect(folders.json()).resolves.toEqual({ folders: [] });
    await expect(destinations.json()).resolves.toEqual({ destinations: [] });
    await expect(created.json()).resolves.toEqual({
      destination: { id: "preset-1" },
    });
    await expect(patched.json()).resolves.toEqual({
      destination: { id: "preset-1" },
    });
    expect(deleted.status).toBe(204);
  });
});
