import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getWorkspaceContextForUserMock,
  recomputeConceptMasteryMock,
  resolveMisconceptionsForConceptMock,
} = vi.hoisted(() => ({
  getWorkspaceContextForUserMock: vi.fn(),
  recomputeConceptMasteryMock: vi.fn(),
  resolveMisconceptionsForConceptMock: vi.fn(),
}));

vi.mock("@avenire/database", () => ({
  recomputeConceptMastery: recomputeConceptMasteryMock,
  resolveMisconceptionsForConcept: resolveMisconceptionsForConceptMock,
}));

vi.mock("@/lib/workspace", () => ({
  getWorkspaceContextForUser: getWorkspaceContextForUserMock,
}));

import { POST } from "./route";

const workspaceContext = {
  user: { id: "user-1" },
  workspace: { workspaceId: "workspace-1" },
};

const postResolve = (body: unknown) =>
  POST(
    new Request("http://localhost:3003/api/misconceptions/resolve", {
      body: JSON.stringify(body),
      method: "POST",
    })
  );

describe("/api/misconceptions/resolve route", () => {
  beforeEach(() => {
    getWorkspaceContextForUserMock.mockReset();
    recomputeConceptMasteryMock.mockReset();
    resolveMisconceptionsForConceptMock.mockReset();

    getWorkspaceContextForUserMock.mockResolvedValue(workspaceContext);
  });

  it("rejects blank scope before resolving misconceptions", async () => {
    const response = await postResolve({
      concept: " ",
      subject: "Biology",
      topic: "Cells",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Concept, subject, and topic are required",
    });
    expect(resolveMisconceptionsForConceptMock).not.toHaveBeenCalled();
    expect(recomputeConceptMasteryMock).not.toHaveBeenCalled();
  });
});
