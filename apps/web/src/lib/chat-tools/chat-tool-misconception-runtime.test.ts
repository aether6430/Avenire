import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@avenire/database", () => ({
  canonicalizeLearningTaxonomy: vi.fn(() => null),
  getActiveMisconceptions: getActiveMisconceptionsMock,
  improveMisconceptionsForConcept: improveMisconceptionsForConceptMock,
  recomputeConceptMastery: recomputeConceptMasteryMock,
  resolveMisconceptionsForConcept: resolveMisconceptionsForConceptMock,
  upsertMisconception: upsertMisconceptionMock,
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

  it("prewarms the active misconception cache only when both scope fields are present", async () => {
    const cacheCtx = {
      ...ctx,
      workspaceId: `workspace-prewarm-${Math.random().toString(36).slice(2)}`,
    };
    getActiveMisconceptionsMock.mockResolvedValue([]);
    vi.resetModules();
    const {
      prewarmActiveMisconceptionsCache: freshPrewarmActiveMisconceptionsCache,
    } = await import("@/lib/chat-tools/chat-tool-misconception-runtime");

    await expect(
      freshPrewarmActiveMisconceptionsCache({
        subject: "  Physics  ",
        topic: "  Momentum  ",
        userId: cacheCtx.userId,
        workspaceId: cacheCtx.workspaceId,
      })
    ).resolves.toBeUndefined();

    expect(getActiveMisconceptionsMock).toHaveBeenCalledWith({
      concept: undefined,
      limit: 24,
      subject: "Physics",
      topic: "Momentum",
      userId: cacheCtx.userId,
      workspaceId: cacheCtx.workspaceId,
    });

    getActiveMisconceptionsMock.mockClear();

    await expect(
      freshPrewarmActiveMisconceptionsCache({
        subject: "Physics",
        topic: "   ",
        userId: cacheCtx.userId,
        workspaceId: cacheCtx.workspaceId,
      })
    ).resolves.toBeUndefined();

    expect(getActiveMisconceptionsMock).not.toHaveBeenCalled();
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
    expect(listed.summary).toBe("Found 1 active misconception(s). Cache miss.");
  });

  it("trims misconception mutation inputs before persistence and follow-up reads", async () => {
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
    getActiveMisconceptionsMock.mockResolvedValue([]);
    resolveMisconceptionsForConceptMock.mockResolvedValue([]);
    improveMisconceptionsForConceptMock.mockResolvedValue([]);

    await logMisconceptionForTool(ctx, {
      concept: "  Impulse  ",
      confidence: 0.75,
      reason: "  Confuses force and impulse  ",
      subject: "  Physics  ",
      topic: "  Impulse  ",
    });

    expect(upsertMisconceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        concept: "Impulse",
        reason: "Confuses force and impulse",
        subject: "Physics",
        topic: "Impulse",
      })
    );
    expect(getActiveMisconceptionsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        concept: "Impulse",
        subject: "Physics",
        topic: "Impulse",
      })
    );

    await resolveMisconceptionForTool(ctx, {
      concept: "  Impulse  ",
      subject: "  Physics  ",
      topic: "  Impulse  ",
    });
    expect(resolveMisconceptionsForConceptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        concept: "Impulse",
        subject: "Physics",
        topic: "Impulse",
      })
    );

    await improveMisconceptionForTool(ctx, {
      concept: "  Impulse  ",
      subject: "  Physics  ",
      topic: "  Impulse  ",
    });
    expect(improveMisconceptionsForConceptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        concept: "Impulse",
        subject: "Physics",
        topic: "Impulse",
      })
    );
  });

  it("fails closed when normalized misconception mutation fields are empty", async () => {
    await expect(
      logMisconceptionForTool(ctx, {
        concept: "   ",
        confidence: 0.75,
        reason: "   ",
        subject: "   ",
        topic: "   ",
      })
    ).rejects.toThrow(
      "Misconception concept, subject, topic, and reason are required."
    );

    await expect(
      resolveMisconceptionForTool(ctx, {
        concept: "   ",
        subject: "   ",
        topic: "   ",
      })
    ).rejects.toThrow(
      "Misconception concept, subject, and topic are required."
    );

    await expect(
      improveMisconceptionForTool(ctx, {
        concept: "   ",
        subject: "   ",
        topic: "   ",
      })
    ).rejects.toThrow(
      "Misconception concept, subject, and topic are required."
    );

    await expect(
      resolveMisconceptionSeed(ctx, {
        concept: "   ",
        reason: "   ",
        subject: "   ",
        topic: "   ",
      })
    ).rejects.toThrow(
      "Misconception concept, subject, topic, and reason are required."
    );

    expect(upsertMisconceptionMock).not.toHaveBeenCalled();
    expect(resolveMisconceptionsForConceptMock).not.toHaveBeenCalled();
    expect(improveMisconceptionsForConceptMock).not.toHaveBeenCalled();
    expect(getActiveMisconceptionsMock).not.toHaveBeenCalled();
  });

  it("treats whitespace-only misconception scope fields as unset", async () => {
    const scopeCtx = {
      ...ctx,
      workspaceId: `workspace-scope-${Math.random().toString(36).slice(2)}`,
    };
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
        workspaceId: scopeCtx.workspaceId,
      },
    ]);

    const listed = await listMisconceptionsForTool(scopeCtx, {
      subject: "   ",
    });

    expect(listed.count).toBe(1);
    expect(getActiveMisconceptionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: undefined,
        topic: undefined,
        concept: undefined,
      })
    );
  });

  it("reuses cached active misconception reads for repeated identical requests", async () => {
    const cacheCtx = {
      ...ctx,
      workspaceId: `workspace-cache-${Math.random().toString(36).slice(2)}`,
    };

    getActiveMisconceptionsMock.mockResolvedValue([
      {
        concept: "Cached Momentum",
        confidence: 0.8,
        createdAt: "2026-05-17T00:00:00.000Z",
        reason: "Thinks momentum disappears",
        resolvedAt: null,
        source: "chat_tool",
        subject: "Physics Cache",
        topic: "Momentum Cache",
        updatedAt: "2026-05-17T00:00:00.000Z",
        workspaceId: cacheCtx.workspaceId,
      },
    ]);

    vi.resetModules();
    const { listMisconceptionsForTool: freshListMisconceptionsForTool } =
      await import("@/lib/chat-tools/chat-tool-misconception-runtime");

    const first = await freshListMisconceptionsForTool(cacheCtx, {
      subject: "Physics Cache",
      topic: "Momentum Cache",
    });
    const second = await freshListMisconceptionsForTool(cacheCtx, {
      subject: "Physics Cache",
      topic: "Momentum Cache",
    });

    expect(first.count).toBe(1);
    expect(second.count).toBe(1);
    expect(first.summary).toBe("Found 1 active misconception(s). Cache miss.");
    expect(second.summary).toBe("Found 1 active misconception(s). Cache hit.");
    expect(getActiveMisconceptionsMock).toHaveBeenCalledTimes(1);
  });

  it("invalidates cached active misconception lists after a mutation changes the set", async () => {
    const cacheCtx = {
      ...ctx,
      workspaceId: `workspace-mutation-${Math.random().toString(36).slice(2)}`,
    };

    const storedRecord = {
      concept: "Impulse",
      confidence: 0.75,
      createdAt: "2026-05-17T00:00:00.000Z",
      reason: "Confuses force and impulse",
      resolvedAt: null,
      source: "chat_tool",
      subject: "Physics",
      topic: "Impulse",
      updatedAt: "2026-05-17T00:00:00.000Z",
      workspaceId: cacheCtx.workspaceId,
    };

    vi.resetModules();
    const {
      listMisconceptionsForTool: freshListMisconceptionsForTool,
      logMisconceptionForTool: freshLogMisconceptionForTool,
    } = await import("@/lib/chat-tools/chat-tool-misconception-runtime");

    getActiveMisconceptionsMock.mockResolvedValueOnce([]);
    const first = await freshListMisconceptionsForTool(cacheCtx, {
      subject: "Physics",
      topic: "Impulse",
    });

    upsertMisconceptionMock.mockResolvedValue(storedRecord);
    getActiveMisconceptionsMock.mockResolvedValueOnce([storedRecord]);
    await freshLogMisconceptionForTool(cacheCtx, {
      concept: "Impulse",
      confidence: 0.75,
      reason: "Confuses force and impulse",
      subject: "Physics",
      topic: "Impulse",
    });

    getActiveMisconceptionsMock.mockResolvedValueOnce([storedRecord]);
    const second = await freshListMisconceptionsForTool(cacheCtx, {
      subject: "Physics",
      topic: "Impulse",
    });

    expect(first.summary).toBe("No active misconceptions found. Cache miss.");
    expect(second.summary).toBe("Found 1 active misconception(s). Cache miss.");
    expect(second.count).toBe(1);
    expect(getActiveMisconceptionsMock).toHaveBeenCalledTimes(3);
  });

  it("exposes the cache-backed misconception tool description in createChatTools", async () => {
    const { createChatTools } = await import("@/lib/chat-tools");

    const tools = createChatTools({
      ...ctx,
      agentActivityId: "agent-1",
      rootFolderId: "root-1",
    });

    expect(
      (tools.list_misconceptions as { description?: string }).description
    ).toContain("through the low-latency cache");
    expect(
      (tools.list_misconceptions as { description?: string }).description
    ).toContain("server-provided misconception memory is absent");
  }, 15_000);

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
      concept: "  Collisions  ",
      reason: "  Mixes elastic and inelastic collisions  ",
      subject: "  Physics  ",
      topic: "  Collisions  ",
    });

    expect(seed.concept).toBe("Collisions");
    expect(seed.id).toBe("draft");
    expect(seed.active).toBe(true);
    expect(seed.reason).toBe("Mixes elastic and inelastic collisions");
    expect(seed.subject).toBe("Physics");
    expect(seed.topic).toBe("Collisions");
  });
});
