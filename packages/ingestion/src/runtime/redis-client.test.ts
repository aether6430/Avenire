import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createManagedRedisClient,
  ensureManagedRedisClient,
  resetRedisCircuitBreakersForTests,
} from "./redis-client";

function createClient(connect: () => Promise<void>) {
  const client = createManagedRedisClient("redis://cache", "test");
  vi.spyOn(client, "connect").mockImplementation(connect);
  return client;
}

describe("managed Redis circuit breaker", () => {
  afterEach(() => {
    resetRedisCircuitBreakersForTests();
    vi.useRealTimers();
  });

  it("opens after repeated connection failures and probes once after cooldown", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-11T00:00:00.000Z"));
    const connect = vi.fn(async () => {
      throw new Error("Connection is closed");
    });
    const client = createClient(connect);

    await ensureManagedRedisClient(client, "redis://cache", "retrieval");
    await ensureManagedRedisClient(client, "redis://cache", "retrieval");
    await ensureManagedRedisClient(client, "redis://cache", "retrieval");
    await ensureManagedRedisClient(client, "redis://cache", "retrieval");
    expect(connect).toHaveBeenCalledTimes(3);

    vi.advanceTimersByTime(30_000);
    await ensureManagedRedisClient(client, "redis://cache", "retrieval");
    expect(connect).toHaveBeenCalledTimes(4);
  });

  it("allows only one concurrent recovery probe", async () => {
    let release: (() => void) | undefined;
    const connect = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        })
    );
    const client = createClient(connect);

    const first = ensureManagedRedisClient(
      client,
      "redis://cache",
      "retrieval"
    );
    const second = ensureManagedRedisClient(
      client,
      "redis://cache",
      "retrieval"
    );

    await expect(second).resolves.toBeNull();
    expect(connect).toHaveBeenCalledTimes(1);
    release?.();
    await expect(first).resolves.toBe(client);
  });
});
