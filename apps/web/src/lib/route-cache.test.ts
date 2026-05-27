import { describe, expect, it } from "vitest";
import { createRouteCacheKey } from "./route-cache";

describe("route cache", () => {
  it("builds stable keys for equivalent params", () => {
    const first = createRouteCacheKey({
      namespace: "flashcards",
      params: {
        from: "2026-05-01",
        route: "revision-calendar",
        to: "2026-05-31",
      },
      scope: "workspace-1",
      version: "1",
    });
    const second = createRouteCacheKey({
      namespace: "flashcards",
      params: {
        route: "revision-calendar",
        to: "2026-05-31",
        from: "2026-05-01",
      },
      scope: "workspace-1",
      version: "1",
    });

    expect(first).toBe(second);
  });

  it("separates route keys by namespace, scope, and version", () => {
    const base = createRouteCacheKey({
      namespace: "flashcards",
      params: { route: "revision-calendar" },
      scope: "workspace-1",
      version: "1",
    });

    expect(base).not.toBe(
      createRouteCacheKey({
        namespace: "workspace",
        params: { route: "revision-calendar" },
        scope: "workspace-1",
        version: "1",
      })
    );
    expect(base).not.toBe(
      createRouteCacheKey({
        namespace: "flashcards",
        params: { route: "revision-calendar" },
        scope: "workspace-2",
        version: "1",
      })
    );
    expect(base).not.toBe(
      createRouteCacheKey({
        namespace: "flashcards",
        params: { route: "revision-calendar" },
        scope: "workspace-1",
        version: "2",
      })
    );
  });
});
