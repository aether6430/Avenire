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

describe("/api/misconceptions/resolve route", () => {
  beforeEach(() => {
    getWorkspaceContextForUserMock.mockReset();
    recomputeConceptMasteryMock.mockReset();
    resolveMisconceptionsForConceptMock.mockReset();
  });

  it("returns unauthorized without a workspace context", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3003/api/misconceptions/resolve", {
        body: JSON.stringify({}),
        method: "POST",
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("rejects missing required fields", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });

    const response = await POST(
      new Request("http://localhost:3003/api/misconceptions/resolve", {
        body: JSON.stringify({ concept: "Fractions", subject: " " }),
        method: "POST",
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Concept, subject, and topic are required",
    });
  });

  it("resolves a misconception with normalized text and recomputes mastery", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    resolveMisconceptionsForConceptMock.mockResolvedValue([{ id: "m-1" }]);
    recomputeConceptMasteryMock.mockResolvedValue(undefined);

    const response = await POST(
      new Request("http://localhost:3003/api/misconceptions/resolve", {
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
      resolvedCount: 1,
    });
    expect(resolveMisconceptionsForConceptMock).toHaveBeenCalledWith({
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
    resolveMisconceptionsForConceptMock.mockRejectedValue(
      new Error("database offline")
    );

    const response = await POST(
      new Request("http://localhost:3003/api/misconceptions/resolve", {
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
