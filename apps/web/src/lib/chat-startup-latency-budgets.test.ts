import { describe, expect, it } from "vitest";
import {
  ACTIVE_MISCONCEPTION_CONTEXT_TIMEOUT_MS,
  CHAT_STARTUP_CONTEXT_TIMEOUT_MS,
  MISCONCEPTION_SIGNAL_TIMEOUT_MS,
} from "./chat-startup-latency-budgets";

describe("chat startup latency budgets", () => {
  it("keeps active misconception context lookup inside a small first-token budget", () => {
    expect(ACTIVE_MISCONCEPTION_CONTEXT_TIMEOUT_MS).toBeLessThanOrEqual(100);
  });

  it("keeps heavyweight misconception signal detection out of the startup budget", () => {
    expect(MISCONCEPTION_SIGNAL_TIMEOUT_MS).toBeGreaterThan(
      ACTIVE_MISCONCEPTION_CONTEXT_TIMEOUT_MS
    );
    expect(CHAT_STARTUP_CONTEXT_TIMEOUT_MS).toBeGreaterThan(
      ACTIVE_MISCONCEPTION_CONTEXT_TIMEOUT_MS
    );
  });
});
