import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createToolResultCacheKey,
  getCachedToolResult,
} from "./ai-tool-result-cache";

describe("AI tool result cache", () => {
  it("builds stable keys from tool name, scope, and input", () => {
    const first = createToolResultCacheKey({
      input: { topic: "Kinematics", subject: "Physics" },
      scope: { workspaceId: "workspace-1", userId: "user-1" },
      toolName: "list_misconceptions",
    });
    const second = createToolResultCacheKey({
      input: { subject: "Physics", topic: "Kinematics" },
      scope: { userId: "user-1", workspaceId: "workspace-1" },
      toolName: "list_misconceptions",
    });

    assert.equal(first, second);
  });

  it("returns the in-memory cached value without executing the tool again", async () => {
    const memoryCache = new Map();
    let calls = 0;
    const input = {
      execute: async () => {
        calls += 1;
        return [{ concept: "velocity" }];
      },
      input: { subject: "Physics", topic: "Kinematics" },
      scope: { userId: "user-1", workspaceId: "workspace-1" },
      toolName: "list_misconceptions",
      validate: (value: unknown): value is Array<{ concept: string }> =>
        Array.isArray(value),
    };

    const miss = await getCachedToolResult(input, {
      getRedisClient: async () => null,
      memoryCache,
      nowMs: () => 1000,
    });
    const hit = await getCachedToolResult(input, {
      getRedisClient: async () => null,
      memoryCache,
      nowMs: () => 2000,
    });

    assert.equal(miss.cache, "miss");
    assert.equal(hit.cache, "hit");
    assert.deepEqual(hit.value, [{ concept: "velocity" }]);
    assert.equal(calls, 1);
  });

  it("reads and writes Redis with the configured TTL", async () => {
    const writes: Array<{
      key: string;
      options: { EX: number };
      value: string;
    }> = [];
    const redis = {
      get: async () => null,
      set: async (key: string, value: string, options: { EX: number }) => {
        writes.push({ key, options, value });
      },
    };

    const result = await getCachedToolResult(
      {
        execute: async () => [{ concept: "acceleration" }],
        input: { subject: "Physics", topic: "Kinematics" },
        scope: { userId: "user-1", workspaceId: "workspace-1" },
        toolName: "list_misconceptions",
        ttlSeconds: 300,
        validate: (value: unknown): value is Array<{ concept: string }> =>
          Array.isArray(value),
      },
      {
        getRedisClient: async () => redis as never,
        memoryCache: new Map(),
        nowMs: () => 1000,
      }
    );

    assert.equal(result.cache, "miss");
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0]?.options, { EX: 300 });
    assert.deepEqual(JSON.parse(writes[0]?.value ?? "null"), [
      { concept: "acceleration" },
    ]);
  });
});
