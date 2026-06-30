import { describe, expect, it, vi } from "vitest";
import { schedulePostStartMisconceptionSignalCheck } from "./chat-misconception-signal-scheduler";

describe("schedulePostStartMisconceptionSignalCheck", () => {
  it("defers misconception signal detection until the scheduled post-start task runs", async () => {
    const tasks: Array<() => Promise<void>> = [];
    const detect = vi.fn(async () => ({
      candidates: [],
      interventionBlock: null,
      matched: false,
    }));
    const onComplete = vi.fn();
    const times = [100, 145.6789];

    schedulePostStartMisconceptionSignalCheck({
      detect,
      now: () => times.shift() ?? 145.6789,
      onComplete,
      schedule: (task) => {
        tasks.push(task);
      },
    });

    expect(tasks).toHaveLength(1);
    expect(detect).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();

    await tasks[0]?.();

    expect(detect).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({
      elapsedMs: 45.679,
      signal: {
        candidates: [],
        interventionBlock: null,
        matched: false,
      },
    });
  });

  it("does not wait for a slow detector when scheduling post-start work", async () => {
    const tasks: Array<() => Promise<void>> = [];
    let resolveDetection: (() => void) | null = null;
    const detect = vi.fn(
      () =>
        new Promise<{
          candidates: [];
          interventionBlock: null;
          matched: false;
        }>((resolve) => {
          resolveDetection = () =>
            resolve({
              candidates: [],
              interventionBlock: null,
              matched: false,
            });
        })
    );
    const onComplete = vi.fn();

    schedulePostStartMisconceptionSignalCheck({
      detect,
      onComplete,
      schedule: (task) => {
        tasks.push(task);
      },
    });

    expect(tasks).toHaveLength(1);
    expect(detect).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();

    const taskPromise = tasks[0]?.();
    expect(detect).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();

    resolveDetection?.();
    await taskPromise;

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("completes with a null signal when detection rejects", async () => {
    const tasks: Array<() => Promise<void>> = [];
    const detect = vi.fn(async () => {
      throw new Error("model unavailable");
    });
    const onComplete = vi.fn();
    const times = [10, 11.25];

    schedulePostStartMisconceptionSignalCheck({
      detect,
      now: () => times.shift() ?? 11.25,
      onComplete,
      schedule: (task) => {
        tasks.push(task);
      },
    });

    await expect(tasks[0]?.()).resolves.toBeUndefined();

    expect(detect).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({
      elapsedMs: 1.25,
      signal: null,
    });
  });

  it("removes detector latency from the handoff path compared with serial startup", async () => {
    let resolveSerialDetection: (() => void) | null = null;
    const serialEvents: string[] = [];
    const serialDetector = () =>
      new Promise<null>((resolve) => {
        resolveSerialDetection = () => resolve(null);
      });

    const serialStartup = async () => {
      await serialDetector();
      serialEvents.push("handoff");
    };

    const serialPromise = serialStartup();
    await Promise.resolve();
    expect(serialEvents).toEqual([]);

    resolveSerialDetection?.();
    await serialPromise;
    expect(serialEvents).toEqual(["handoff"]);

    let resolveDeferredDetection: (() => void) | null = null;
    const deferredEvents: string[] = [];
    const tasks: Array<() => Promise<void>> = [];

    schedulePostStartMisconceptionSignalCheck({
      detect: () =>
        new Promise<null>((resolve) => {
          deferredEvents.push("detect-started");
          resolveDeferredDetection = () => resolve(null);
        }),
      onComplete: () => {
        deferredEvents.push("detect-completed");
      },
      schedule: (task) => {
        tasks.push(task);
      },
    });
    deferredEvents.push("handoff");

    expect(deferredEvents).toEqual(["handoff"]);

    const deferredTaskPromise = tasks[0]?.();
    expect(deferredEvents).toEqual(["handoff", "detect-started"]);

    resolveDeferredDetection?.();
    await deferredTaskPromise;

    expect(deferredEvents).toEqual([
      "handoff",
      "detect-started",
      "detect-completed",
    ]);
  });
});
