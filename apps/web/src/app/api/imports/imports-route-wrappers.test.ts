import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSessionUserMock,
  handleGoogleDriveImportRoutePostMock,
  handleGoogleDrivePickerTokenRouteGetMock,
  handleImportsDestinationFoldersGetMock,
  handleImportsDestinationGetMock,
  handleImportsDestinationPutMock,
  handleImportsProvidersGetMock,
  handleNotionImportRoutePostMock,
  handleNotionPagesRouteGetMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  handleGoogleDriveImportRoutePostMock: vi.fn(),
  handleGoogleDrivePickerTokenRouteGetMock: vi.fn(),
  handleImportsDestinationFoldersGetMock: vi.fn(),
  handleImportsDestinationGetMock: vi.fn(),
  handleImportsDestinationPutMock: vi.fn(),
  handleImportsProvidersGetMock: vi.fn(),
  handleNotionImportRoutePostMock: vi.fn(),
  handleNotionPagesRouteGetMock: vi.fn(),
}));

vi.mock("@/lib/workspace", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("./providers/imports-providers-route-get", () => ({
  handleImportsProvidersGet: handleImportsProvidersGetMock,
}));

vi.mock("./destination/imports-destination-route-get", () => ({
  handleImportsDestinationGet: handleImportsDestinationGetMock,
}));

vi.mock("./destination/imports-destination-route-put", () => ({
  handleImportsDestinationPut: handleImportsDestinationPutMock,
}));

vi.mock("./destination/folders/imports-destination-folders-route-get", () => ({
  handleImportsDestinationFoldersGet: handleImportsDestinationFoldersGetMock,
}));

vi.mock("./notion/pages/imports-notion-pages-route-get", () => ({
  handleNotionPagesRouteGet: handleNotionPagesRouteGetMock,
}));

vi.mock(
  "./google-drive/picker-token/imports-google-drive-picker-token-route-get",
  () => ({
    handleGoogleDrivePickerTokenRouteGet:
      handleGoogleDrivePickerTokenRouteGetMock,
  })
);

vi.mock("./google-drive/import/imports-google-drive-import-route-post", () => ({
  handleGoogleDriveImportRoutePost: handleGoogleDriveImportRoutePostMock,
}));

vi.mock("./notion/import/imports-notion-import-route-post", () => ({
  handleNotionImportRoutePost: handleNotionImportRoutePostMock,
}));

import { GET as getImportsDestinationFolders } from "./destination/folders/route";
import {
  GET as getImportsDestination,
  PUT as putImportsDestination,
} from "./destination/route";
import { POST as postGoogleDriveImport } from "./google-drive/import/route";
import { GET as getGoogleDrivePickerToken } from "./google-drive/picker-token/route";
import { POST as postNotionImport } from "./notion/import/route";
import { GET as getNotionPages } from "./notion/pages/route";
import { GET as getImportsProviders } from "./providers/route";

describe("imports route wrappers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    handleImportsProvidersGetMock.mockResolvedValue(
      Response.json({ providers: {} })
    );
    handleImportsDestinationGetMock.mockResolvedValue(
      Response.json({ destination: null })
    );
    handleImportsDestinationPutMock.mockResolvedValue(
      Response.json({ destination: { id: "destination-1" } })
    );
    handleImportsDestinationFoldersGetMock.mockResolvedValue(
      Response.json({ folders: [] })
    );
    handleNotionPagesRouteGetMock.mockResolvedValue(
      Response.json({ pages: [] })
    );
    handleGoogleDrivePickerTokenRouteGetMock.mockResolvedValue(
      Response.json({ accessToken: "token-1" })
    );
    handleGoogleDriveImportRoutePostMock.mockResolvedValue(
      Response.json({ imported: [] }, { status: 201 })
    );
    handleNotionImportRoutePostMock.mockResolvedValue(
      Response.json({ imported: [] }, { status: 201 })
    );
  });

  it("fails closed with 401 for unauthorized import route access", async () => {
    getSessionUserMock.mockResolvedValueOnce(null);

    const response = await getImportsProviders();
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized",
    });
  });

  it("delegates imports route wrappers through their dedicated handlers", async () => {
    const request = new Request("https://avenire.space");

    const providers = await getImportsProviders();
    const destination = await getImportsDestination();
    const destinationPut = await putImportsDestination(request);
    const destinationFolders = await getImportsDestinationFolders(request);
    const notionPages = await getNotionPages();
    const googlePicker = await getGoogleDrivePickerToken();
    const googleImport = await postGoogleDriveImport(request);
    const notionImport = await postNotionImport(request);

    expect(handleImportsProvidersGetMock).toHaveBeenCalledWith({
      userId: "user-1",
    });
    expect(handleImportsDestinationGetMock).toHaveBeenCalledWith({
      userId: "user-1",
    });
    expect(handleImportsDestinationPutMock).toHaveBeenCalledWith({
      request,
      userId: "user-1",
    });
    expect(handleImportsDestinationFoldersGetMock).toHaveBeenCalledWith({
      request,
      userId: "user-1",
    });
    expect(handleNotionPagesRouteGetMock).toHaveBeenCalledWith({
      userId: "user-1",
    });
    expect(handleGoogleDrivePickerTokenRouteGetMock).toHaveBeenCalledWith({
      userId: "user-1",
    });
    expect(handleGoogleDriveImportRoutePostMock).toHaveBeenCalledWith({
      request,
      userId: "user-1",
    });
    expect(handleNotionImportRoutePostMock).toHaveBeenCalledWith({
      request,
      userId: "user-1",
    });

    await expect(providers.json()).resolves.toEqual({ providers: {} });
    await expect(destination.json()).resolves.toEqual({ destination: null });
    await expect(destinationPut.json()).resolves.toEqual({
      destination: { id: "destination-1" },
    });
    await expect(destinationFolders.json()).resolves.toEqual({ folders: [] });
    await expect(notionPages.json()).resolves.toEqual({ pages: [] });
    await expect(googlePicker.json()).resolves.toEqual({
      accessToken: "token-1",
    });
    await expect(googleImport.json()).resolves.toEqual({ imported: [] });
    await expect(notionImport.json()).resolves.toEqual({ imported: [] });
  });
});
