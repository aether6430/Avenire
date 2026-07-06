import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  adjustMisconceptionConfidenceForConceptMock,
  getWorkspaceContextForUserMock,
  improveMisconceptionsForConceptMock,
  invalidateActiveMisconceptionCachesMock,
  recomputeConceptMasteryMock,
} = vi.hoisted(() => ({
  adjustMisconceptionConfidenceForConceptMock: vi.fn(),
  getWorkspaceContextForUserMock: vi.fn(),
  improveMisconceptionsForConceptMock: vi.fn(),
  invalidateActiveMisconceptionCachesMock: vi.fn(),
  recomputeConceptMasteryMock: vi.fn(),
}));

vi.mock("@avenire/database", () => ({
  adjustMisconceptionConfidenceForConcept:
    adjustMisconceptionConfidenceForConceptMock,
  improveMisconceptionsForConcept: improveMisconceptionsForConceptMock,
  recomputeConceptMastery: recomputeConceptMasteryMock,
}));

vi.mock("@/lib/workspace", () => ({
  getWorkspaceContextForUser: getWorkspaceContextForUserMock,
}));

vi.mock("@/lib/misconception-cache", () => ({
  invalidateActiveMisconceptionCaches: invalidateActiveMisconceptionCachesMock,
}));

import { POST } from "./route";

const workspaceContext = {
  user: { id: "user-1" },
  workspace: { workspaceId: "workspace-1" },
};

const postImprove = (body: unknown) =>
  POST(
    new Request("http://localhost:3003/api/misconceptions/improve", {
      body: JSON.stringify(body),
      method: "POST",
    })
  );

describe("/api/misconceptions/improve route", () => {
  beforeEach(() => {
    adjustMisconceptionConfidenceForConceptMock.mockReset();
    getWorkspaceContextForUserMock.mockReset();
    improveMisconceptionsForConceptMock.mockReset();
    invalidateActiveMisconceptionCachesMock.mockReset();
    recomputeConceptMasteryMock.mockReset();

    getWorkspaceContextForUserMock.mockResolvedValue(workspaceContext);
  });

  it("rejects invalid numeric input before improving misconceptions", async () => {
    const response = await postImprove({
      concept: "Diffusion",
      delta: "abc",
      subject: "Biology",
      topic: "Cells",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid payload",
    });
    expect(adjustMisconceptionConfidenceForConceptMock).not.toHaveBeenCalled();
    expect(improveMisconceptionsForConceptMock).not.toHaveBeenCalled();
    expect(recomputeConceptMasteryMock).not.toHaveBeenCalled();
    expect(invalidateActiveMisconceptionCachesMock).not.toHaveBeenCalled();
  });

  it("invalidates active misconception caches after improving misconceptions", async () => {
    improveMisconceptionsForConceptMock.mockResolvedValue([
      { active: false },
      { active: true },
    ]);

    const response = await postImprove({
      concept: "Diffusion",
      decay: 0.2,
      resolveThreshold: 0.3,
      subject: "Biology",
      topic: "Cells",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      improvedCount: 2,
      resolvedCount: 1,
    });
    expect(invalidateActiveMisconceptionCachesMock).toHaveBeenCalledTimes(1);
    expect(invalidateActiveMisconceptionCachesMock).toHaveBeenCalledWith({
      userId: "user-1",
      workspaceId: "workspace-1",
    });
  });
});
