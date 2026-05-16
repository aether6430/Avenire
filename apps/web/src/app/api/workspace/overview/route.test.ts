import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  createRouteCacheKeyMock,
  getActiveMisconceptionsMock,
  getCachedRouteMock,
  getFlashcardDashboardForUserMock,
  getRouteCacheVersionMock,
  getWeakestConceptsMock,
  getWorkspaceContextForUserMock,
  listFlashcardSetSummariesForUserMock,
  resolveWeakestConceptDrillTargetMock,
  setCachedRouteMock,
} = vi.hoisted(() => ({
  createRouteCacheKeyMock: vi.fn(),
  getActiveMisconceptionsMock: vi.fn(),
  getCachedRouteMock: vi.fn(),
  getFlashcardDashboardForUserMock: vi.fn(),
  getRouteCacheVersionMock: vi.fn(),
  getWeakestConceptsMock: vi.fn(),
  getWorkspaceContextForUserMock: vi.fn(),
  listFlashcardSetSummariesForUserMock: vi.fn(),
  resolveWeakestConceptDrillTargetMock: vi.fn(),
  setCachedRouteMock: vi.fn(),
}));

vi.mock("@/lib/domain-cache", () => ({
  CACHE_NAMESPACES: {
    workspaceOverview: "workspace:overview",
  },
}));

vi.mock("@/lib/flashcards", () => ({
  getFlashcardDashboardForUser: getFlashcardDashboardForUserMock,
  getWeakestConcepts: getWeakestConceptsMock,
  listFlashcardSetSummariesForUser: listFlashcardSetSummariesForUserMock,
  resolveWeakestConceptDrillTarget: resolveWeakestConceptDrillTargetMock,
}));

vi.mock("@/lib/learning-data", () => ({
  getActiveMisconceptions: getActiveMisconceptionsMock,
}));

vi.mock("@/lib/route-cache", () => ({
  createRouteCacheKey: createRouteCacheKeyMock,
  getCachedRoute: getCachedRouteMock,
  getRouteCacheVersion: getRouteCacheVersionMock,
  setCachedRoute: setCachedRouteMock,
}));

vi.mock("@/lib/workspace", () => ({
  getWorkspaceContextForUser: getWorkspaceContextForUserMock,
}));

import { GET } from "./route";

describe("/api/workspace/overview route", () => {
  beforeEach(() => {
    createRouteCacheKeyMock.mockReset();
    getActiveMisconceptionsMock.mockReset();
    getCachedRouteMock.mockReset();
    getFlashcardDashboardForUserMock.mockReset();
    getRouteCacheVersionMock.mockReset();
    getWeakestConceptsMock.mockReset();
    getWorkspaceContextForUserMock.mockReset();
    listFlashcardSetSummariesForUserMock.mockReset();
    resolveWeakestConceptDrillTargetMock.mockReset();
    setCachedRouteMock.mockReset();

    createRouteCacheKeyMock.mockReturnValue("workspace-overview-cache-key");
    getRouteCacheVersionMock.mockResolvedValue("v1");
    setCachedRouteMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns unauthorized when there is no workspace context", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost:3003/api/workspace/overview")
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns cached overview payloads with a hit header", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    getCachedRouteMock.mockResolvedValue({
      activeMisconceptions: [],
      flashcardSets: [{ id: "set-1" }],
      weakestConcepts: [],
      weakestDrillTarget: null,
    });

    const response = await GET(
      new Request("http://localhost:3003/api/workspace/overview?subject=math")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-workspace-overview-cache")).toBe("hit");
    await expect(response.json()).resolves.toEqual({
      activeMisconceptions: [],
      flashcardSets: [{ id: "set-1" }],
      weakestConcepts: [],
      weakestDrillTarget: null,
    });
    expect(listFlashcardSetSummariesForUserMock).not.toHaveBeenCalled();
  });

  it("loads, derives, and caches overview payloads on a cache miss", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    getCachedRouteMock.mockResolvedValue(null);
    listFlashcardSetSummariesForUserMock.mockResolvedValue([{ id: "set-1" }]);
    getWeakestConceptsMock.mockResolvedValue([{ id: "concept-1" }]);
    getActiveMisconceptionsMock.mockResolvedValue([{ id: "m-1" }]);
    getFlashcardDashboardForUserMock.mockResolvedValue({ id: "dash-1" });
    resolveWeakestConceptDrillTargetMock.mockReturnValue({ id: "drill-1" });

    const response = await GET(
      new Request("http://localhost:3003/api/workspace/overview?subject=math")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-workspace-overview-cache")).toBe("miss");
    await expect(response.json()).resolves.toEqual({
      activeMisconceptions: [{ id: "m-1" }],
      flashcardSets: [{ id: "set-1" }],
      weakestConcepts: [{ id: "concept-1" }],
      weakestDrillTarget: { id: "drill-1" },
    });
    expect(resolveWeakestConceptDrillTargetMock).toHaveBeenCalledWith(
      { id: "dash-1" },
      [{ id: "concept-1" }]
    );
    expect(setCachedRouteMock).toHaveBeenCalledWith(
      "workspace:overview",
      "workspace-overview-cache-key",
      {
        activeMisconceptions: [{ id: "m-1" }],
        flashcardSets: [{ id: "set-1" }],
        weakestConcepts: [{ id: "concept-1" }],
        weakestDrillTarget: { id: "drill-1" },
      }
    );
  });

  it("falls back gracefully when non-critical overview loaders fail", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    getCachedRouteMock.mockResolvedValue(null);
    listFlashcardSetSummariesForUserMock.mockResolvedValue([{ id: "set-1" }]);
    getWeakestConceptsMock.mockRejectedValue(new Error("weakest failed"));
    getActiveMisconceptionsMock.mockRejectedValue(
      new Error("misconceptions failed")
    );
    getFlashcardDashboardForUserMock.mockRejectedValue(
      new Error("dashboard failed")
    );

    const response = await GET(
      new Request("http://localhost:3003/api/workspace/overview")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      activeMisconceptions: [],
      flashcardSets: [{ id: "set-1" }],
      weakestConcepts: [],
      weakestDrillTarget: null,
    });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(3);
  });
});
