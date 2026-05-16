import { describe, expect, it, vi } from "vitest";

import { warmDashboardRoutes } from "./dashboard-warmup";

describe("dashboard warmup", () => {
  it("prefetches the canonical dashboard entry routes", () => {
    const prefetch = vi.fn();

    warmDashboardRoutes({ prefetch });

    expect(prefetch.mock.calls.map(([href]) => href)).toEqual([
      "/workspace/chats/new",
      "/workspace/flashcards",
      "/workspace/files",
    ]);
  });
});
