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

describe("/api/misconceptions/delete route", () => {
  beforeEach(() => {
    deleteMisconceptionsForConceptMock.mockReset();
    getWorkspaceContextForUserMock.mockReset();
    recomputeConceptMasteryMock.mockReset();
  });

  it("returns unauthorized without a workspace context", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3003/api/misconceptions/delete", {
        body: JSON.stringify({}),
        method: "POST",
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("fails closed when workspace context lookup throws before misconception deletion begins", async () => {
    getWorkspaceContextForUserMock.mockRejectedValue(
      new Error("misconception delete auth offline")
    );

    const response = await POST(
      new Request("http://localhost:3003/api/misconceptions/delete", {
        body: JSON.stringify({}),
        method: "POST",
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "misconception delete auth offline",
    });
    expect(deleteMisconceptionsForConceptMock).not.toHaveBeenCalled();
    expect(recomputeConceptMasteryMock).not.toHaveBeenCalled();
  });

  it("rejects missing required fields", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });

    const response = await POST(
      new Request("http://localhost:3003/api/misconceptions/delete", {
        body: JSON.stringify({ concept: "Fractions", subject: " " }),
        method: "POST",
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Concept, subject, and topic are required",
    });
  });

  it("deletes misconceptions with normalized text and recomputes mastery", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    deleteMisconceptionsForConceptMock.mockResolvedValue([{ id: "m-1" }]);
    recomputeConceptMasteryMock.mockResolvedValue(undefined);

    const response = await POST(
      new Request("http://localhost:3003/api/misconceptions/delete", {
        body: JSON.stringify({
          concept: "  Fractions  ",
          subject: "  Math  ",
          topic: "  Division  ",
        }),
        method: "POST",
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      deletedCount: 1,
    });
    expect(deleteMisconceptionsForConceptMock).toHaveBeenCalledWith({
      concept: "Fractions",
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
    deleteMisconceptionsForConceptMock.mockRejectedValue(
      new Error("database offline")
    );

    const response = await POST(
      new Request("http://localhost:3003/api/misconceptions/delete", {
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
