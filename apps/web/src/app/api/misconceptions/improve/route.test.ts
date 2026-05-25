import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  adjustMisconceptionConfidenceForConceptMock,
  getWorkspaceContextForUserMock,
  improveMisconceptionsForConceptMock,
  recomputeConceptMasteryMock,
} = vi.hoisted(() => ({
  adjustMisconceptionConfidenceForConceptMock: vi.fn(),
  getWorkspaceContextForUserMock: vi.fn(),
  improveMisconceptionsForConceptMock: vi.fn(),
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

import { POST } from "./route";

describe("/api/misconceptions/improve route", () => {
  beforeEach(() => {
    adjustMisconceptionConfidenceForConceptMock.mockReset();
    getWorkspaceContextForUserMock.mockReset();
    improveMisconceptionsForConceptMock.mockReset();
    recomputeConceptMasteryMock.mockReset();
  });

  it("returns unauthorized without a workspace context", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3003/api/misconceptions/improve", {
        body: JSON.stringify({}),
        method: "POST",
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("fails closed when workspace context lookup throws before misconception improvement begins", async () => {
    getWorkspaceContextForUserMock.mockRejectedValue(
      new Error("misconception improve auth offline")
    );

    const response = await POST(
      new Request("http://localhost:3003/api/misconceptions/improve", {
        body: JSON.stringify({}),
        method: "POST",
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "misconception improve auth offline",
    });
    expect(improveMisconceptionsForConceptMock).not.toHaveBeenCalled();
    expect(recomputeConceptMasteryMock).not.toHaveBeenCalled();
  });

  it("uses delta-based confidence adjustment when delta is provided", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    adjustMisconceptionConfidenceForConceptMock.mockResolvedValue([
      { active: true },
    ]);
    recomputeConceptMasteryMock.mockResolvedValue(undefined);

    const response = await POST(
      new Request("http://localhost:3003/api/misconceptions/improve", {
        body: JSON.stringify({
          concept: "  Fractions  ",
          delta: "0.1",
          subject: "  Math  ",
          topic: "  Division  ",
        }),
        method: "POST",
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      improvedCount: 1,
      resolvedCount: 0,
    });
    expect(adjustMisconceptionConfidenceForConceptMock).toHaveBeenCalledWith({
      concept: "Fractions",
      delta: 0.1,
      subject: "Math",
      topic: "Division",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(improveMisconceptionsForConceptMock).not.toHaveBeenCalled();
    expect(recomputeConceptMasteryMock).toHaveBeenCalledWith({
      concept: "Fractions",
      subject: "Math",
      topic: "Division",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
  });

  it("rejects missing required fields", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });

    const response = await POST(
      new Request("http://localhost:3003/api/misconceptions/improve", {
        body: JSON.stringify({ concept: "  ", subject: "Math" }),
        method: "POST",
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Concept, subject, and topic are required",
    });
  });

  it("improves a misconception with normalized text and numeric thresholds, then recomputes mastery", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    improveMisconceptionsForConceptMock.mockResolvedValue([
      { active: true },
      { active: false },
    ]);
    recomputeConceptMasteryMock.mockResolvedValue(undefined);

    const response = await POST(
      new Request("http://localhost:3003/api/misconceptions/improve", {
        body: JSON.stringify({
          concept: "  Fractions  ",
          decay: "0.5",
          resolveThreshold: "0.8",
          subject: "  Math  ",
          topic: "  Division  ",
        }),
        method: "POST",
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      improvedCount: 2,
      resolvedCount: 1,
    });
    expect(improveMisconceptionsForConceptMock).toHaveBeenCalledWith({
      concept: "Fractions",
      decay: 0.5,
      resolveThreshold: 0.8,
      subject: "Math",
      topic: "Division",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(recomputeConceptMasteryMock).toHaveBeenCalledWith({
      concept: "Fractions",
      subject: "Math",
      topic: "Division",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
  });

  it("maps lower-layer failures to stable json", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    improveMisconceptionsForConceptMock.mockRejectedValue(
      new Error("database offline")
    );

    const response = await POST(
      new Request("http://localhost:3003/api/misconceptions/improve", {
        body: JSON.stringify({
          concept: "Fractions",
          subject: "Math",
          topic: "Division",
        }),
        method: "POST",
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "database offline",
    });
  });
});
