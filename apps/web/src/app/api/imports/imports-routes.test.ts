import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getDataImportOverviewMock,
  listImportableNotionPagesMock,
  saveDataImportDestinationMock,
} = vi.hoisted(() => ({
  getDataImportOverviewMock: vi.fn(),
  listImportableNotionPagesMock: vi.fn(),
  saveDataImportDestinationMock: vi.fn(),
}));

vi.mock("@/lib/imports", () => ({
  getDataImportOverview: getDataImportOverviewMock,
  listImportableNotionPages: listImportableNotionPagesMock,
  saveDataImportDestination: saveDataImportDestinationMock,
}));

import { handleImportsDestinationPut } from "@/app/api/imports/destination/imports-destination-route-put";
import { handleNotionPagesRouteGet } from "@/app/api/imports/notion/pages/imports-notion-pages-route-get";
import { handleImportsProvidersGet } from "@/app/api/imports/providers/imports-providers-route-get";

describe("imports routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDataImportOverviewMock.mockResolvedValue({
      destination: null,
      providers: {
        google: { ready: true },
        notion: { ready: false },
      },
    });
    listImportableNotionPagesMock.mockResolvedValue([
      {
        id: "page-1",
        lastEditedTime: "2026-05-18T00:00:00.000Z",
        title: "Linear Algebra",
        url: "https://notion.so/page-1",
      },
    ]);
    saveDataImportDestinationMock.mockResolvedValue({
      folderId: "550e8400-e29b-41d4-a716-446655440001",
      workspaceId: "550e8400-e29b-41d4-a716-446655440000",
    });
  });

  it("loads import providers overview and notion pages through the shared imports runtime", async () => {
    const providers = await handleImportsProvidersGet({ userId: "user-1" });
    const notionPages = await handleNotionPagesRouteGet({ userId: "user-1" });

    expect(getDataImportOverviewMock).toHaveBeenCalledWith("user-1");
    expect(listImportableNotionPagesMock).toHaveBeenCalledWith("user-1");
    await expect(providers.json()).resolves.toEqual({
      destination: null,
      providers: {
        google: { ready: true },
        notion: { ready: false },
      },
    });
    await expect(notionPages.json()).resolves.toEqual({
      pages: [
        {
          id: "page-1",
          lastEditedTime: "2026-05-18T00:00:00.000Z",
          title: "Linear Algebra",
          url: "https://notion.so/page-1",
        },
      ],
    });
  });

  it("validates import destination payloads before saving and persists valid ones", async () => {
    const invalid = await handleImportsDestinationPut({
      request: {
        json: vi.fn().mockResolvedValue({}),
      } as never,
      userId: "user-1",
    });
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({
      error: "Invalid payload",
    });

    const valid = await handleImportsDestinationPut({
      request: {
        json: vi.fn().mockResolvedValue({
          folderId: "550e8400-e29b-41d4-a716-446655440001",
          workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        }),
      } as never,
      userId: "user-1",
    });
    expect(saveDataImportDestinationMock).toHaveBeenCalledWith({
      folderId: "550e8400-e29b-41d4-a716-446655440001",
      userId: "user-1",
      workspaceId: "550e8400-e29b-41d4-a716-446655440000",
    });
    await expect(valid.json()).resolves.toEqual({
      destination: {
        folderId: "550e8400-e29b-41d4-a716-446655440001",
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
      },
    });
  });
});
