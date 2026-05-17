import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@avenire/database", () => ({
  canonicalizeLearningTaxonomy: vi.fn(() => null),
}));

const {
  getActiveMisconceptionsMock,
  improveMisconceptionsForConceptMock,
  logInfoMock,
  recomputeConceptMasteryMock,
  resolveMisconceptionsForConceptMock,
  upsertMisconceptionMock,
} = vi.hoisted(() => ({
  getActiveMisconceptionsMock: vi.fn(),
  improveMisconceptionsForConceptMock: vi.fn(),
  logInfoMock: vi.fn(),
  recomputeConceptMasteryMock: vi.fn(),
  resolveMisconceptionsForConceptMock: vi.fn(),
  upsertMisconceptionMock: vi.fn(),
}));

vi.mock("@avenire/observability", () => ({
  logInfo: logInfoMock,
}));

vi.mock("@/lib/learning-data", () => ({
  getActiveMisconceptions: getActiveMisconceptionsMock,
  improveMisconceptionsForConcept: improveMisconceptionsForConceptMock,
  recomputeConceptMastery: recomputeConceptMasteryMock,
  resolveMisconceptionsForConcept: resolveMisconceptionsForConceptMock,
  upsertMisconception: upsertMisconceptionMock,
}));

import {
  getActiveMisconceptionContext,
  improveMisconceptionForTool,
  listMisconceptionsForTool,
  logMisconceptionForTool,
  resolveMisconceptionForTool,
  resolveMisconceptionSeed,
} from "@/lib/chat-tools/chat-tool-misconception-runtime";

const ctx = {
  chatSlug: "chat-1",
  userId: "user-1",
  workspaceId: "workspace-1",
};

describe("chat tool misconception runtime", () => {
  beforeEach(() => {
    getActiveMisconceptionsMock.mockReset();
    improveMisconceptionsForConceptMock.mockReset();
    logInfoMock.mockReset();
    recomputeConceptMasteryMock.mockReset();
    resolveMisconceptionsForConceptMock.mockReset();
    upsertMisconceptionMock.mockReset();
  });

  it("returns injected misconception context only when subject/topic exist", async () => {
    await expect(
      getActiveMisconceptionContext({
        subject: null,
        topic: "Momentum",
        userId: "user-1",
        workspaceId: "workspace-1",
      })
    ).resolves.toBeNull();

    getActiveMisconceptionsMock.mockResolvedValue([
      {
        confidence: 0.8,
        concept: "Momentum",
        reason: "Thinks momentum disappears",
        subject: "Physics",
        topic: "Momentum",
        updatedAt: "2026-05-17T00:00:00.000Z",
      },
    ]);

    const context = await getActiveMisconceptionContext({
      subject: "Physics",
      topic: "Momentum",
      userId: "user-1",
      workspaceId: "workspace-1",
    });

    expect(context).toContain("Active learning misconceptions:");
    expect(logInfoMock).toHaveBeenCalled();
  });

  it("stores and lists misconceptions for tool output", async () => {
    upsertMisconceptionMock.mockResolvedValue({
      concept: "Impulse",
      confidence: 0.75,
      createdAt: "2026-05-17T00:00:00.000Z",
      reason: "Confuses force and impulse",
      resolvedAt: null,
      source: "chat_tool",
      subject: "Physics",
      topic: "Impulse",
      updatedAt: "2026-05-17T00:00:00.000Z",
      workspaceId: "workspace-1",
    });
    getActiveMisconceptionsMock.mockResolvedValue([
      {
        concept: "Impulse",
        confidence: 0.75,
        createdAt: "2026-05-17T00:00:00.000Z",
        reason: "Confuses force and impulse",
        resolvedAt: null,
        source: "chat_tool",
        subject: "Physics",
        topic: "Impulse",
        updatedAt: "2026-05-17T00:00:00.000Z",
        workspaceId: "workspace-1",
      },
    ]);

    const stored = await logMisconceptionForTool(ctx, {
      concept: "Impulse",
      confidence: 0.75,
      reason: "Confuses force and impulse",
      subject: "Physics",
      topic: "Impulse",
    });

    expect(stored.activeMisconceptionsCount).toBe(1);
    expect(stored.summary).toContain("Impulse");

    const listed = await listMisconceptionsForTool(ctx, {
      subject: "Physics",
    });
    expect(listed.count).toBe(1);
    expect(listed.misconceptions[0]?.concept).toBe("Impulse");
  });

  it("resolves and improves misconceptions while recomputing mastery", async () => {
    resolveMisconceptionsForConceptMock.mockResolvedValue([{ id: "m-1" }]);
    getActiveMisconceptionsMock.mockResolvedValue([]);

    const resolved = await resolveMisconceptionForTool(ctx, {
      concept: "Momentum",
      subject: "Physics",
      topic: "Momentum",
    });

    expect(recomputeConceptMasteryMock).toHaveBeenCalled();
    expect(resolved.resolvedCount).toBe(1);

    improveMisconceptionsForConceptMock.mockResolvedValue([
      { active: false },
      { active: true },
    ]);
    getActiveMisconceptionsMock.mockResolvedValueOnce([]);

    const improved = await improveMisconceptionForTool(ctx, {
      concept: "Momentum",
      decay: 0.2,
      resolveThreshold: 0.3,
      subject: "Physics",
      topic: "Momentum",
    });

    expect(improved.improvedCount).toBe(2);
    expect(improved.resolvedCount).toBe(1);
  });

  it("returns a draft misconception seed when nothing is active", async () => {
    getActiveMisconceptionsMock.mockResolvedValue([]);

    const seed = await resolveMisconceptionSeed(ctx, {
      concept: "Collisions",
      reason: "Mixes elastic and inelastic collisions",
      subject: "Physics",
      topic: "Collisions",
    });

    expect(seed.concept).toBe("Collisions");
    expect(seed.id).toBe("draft");
    expect(seed.active).toBe(true);
  });
});
