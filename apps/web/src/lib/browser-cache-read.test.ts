import { afterEach, describe, expect, it, vi } from "vitest";
import { readBrowserCache } from "@/lib/browser-cache-read";

function createLocalStorageMock(
  initialEntries: Record<string, string> = {}
): Storage {
  const store = new Map(Object.entries(initialEntries));

  return {
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.get(key) ?? null;
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    get length() {
      return store.size;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(key, value);
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("browser cache read", () => {
  it("fails closed when window is unavailable", () => {
    expect(
      readBrowserCache(
        "avenire:test",
        (value): value is string => typeof value === "string"
      )
    ).toBeNull();
  });

  it("returns validated payloads from local storage", () => {
    vi.stubGlobal("window", {
      localStorage: createLocalStorageMock({
        "avenire:test": JSON.stringify({
          cachedAt: 123,
          value: "ready",
        }),
      }),
    });

    expect(
      readBrowserCache(
        "avenire:test",
        (
          value
        ): value is {
          cachedAt: number;
          value: string;
        } =>
          Boolean(
            value &&
              typeof value === "object" &&
              !Array.isArray(value) &&
              typeof (value as { cachedAt?: unknown }).cachedAt === "number" &&
              typeof (value as { value?: unknown }).value === "string"
          )
      )
    ).toEqual({
      cachedAt: 123,
      value: "ready",
    });
  });

  it("fails closed for malformed JSON and validator mismatches", () => {
    vi.stubGlobal("window", {
      localStorage: createLocalStorageMock({
        "avenire:broken": "{not-json",
        "avenire:wrong-shape": JSON.stringify({
          value: 42,
        }),
      }),
    });

    expect(
      readBrowserCache(
        "avenire:broken",
        (value): value is string => typeof value === "string"
      )
    ).toBeNull();
    expect(
      readBrowserCache(
        "avenire:wrong-shape",
        (value): value is string => typeof value === "string"
      )
    ).toBeNull();
  });
});
