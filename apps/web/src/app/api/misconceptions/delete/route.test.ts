import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  deleteMisconceptionsForConceptMock,
  getWorkspaceContextForUserMock,
  recomputeConceptMasteryMock,
} = vi.hoisted(() => ({
  deleteMisconceptionsForConceptMock: vi.fn(),
  getWorkspaceContextForUserMock: vi.fn(),
  recomputeConceptMasteryMock: vi.fn(),
}));

vi.mock("@avenire/database", () => ({
  deleteMisconceptionsForConcept: deleteMisconceptionsForConceptMock,
  recomputeConceptMastery: recomputeConceptMasteryMock,
}));

vi.mock("@/lib/workspace", () => ({
  getWorkspaceContextForUser: getWorkspaceContextForUserMock,
}));

import { POST } from "./route";

const workspaceContext = {
  user: { id: "user-1" },
  workspace: { workspaceId: "workspace-1" },
};

const postDelete = (body: unknown) =>
  POST(
    new Request("http://localhost:3003/api/misconceptions/delete", {
      body: JSON.stringify(body),
      method: "POST",
    })
  );

describe("/api/misconceptions/delete route", () => {
  beforeEach(() => {
    deleteMisconceptionsForConceptMock.mockReset();
    getWorkspaceContextForUserMock.mockReset();
    recomputeConceptMasteryMock.mockReset();

    getWorkspaceContextForUserMock.mockResolvedValue(workspaceContext);
  });

  it("rejects blank scope before deleting misconceptions", async () => {
    const response = await postDelete({
      concept: "Diffusion",
      subject: "",
      topic: "Cells",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Concept, subject, and topic are required",
    });
    expect(deleteMisconceptionsForConceptMock).not.toHaveBeenCalled();
    expect(recomputeConceptMasteryMock).not.toHaveBeenCalled();
  });
});
