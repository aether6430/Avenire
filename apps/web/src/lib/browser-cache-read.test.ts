import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readBrowserCache } from "@/lib/browser-cache-read";

const browserCacheReadSource = readFileSync(
  resolve(import.meta.dirname, "./browser-cache-read.ts"),
  "utf8"
);
const browserCacheWriteSource = readFileSync(
  resolve(import.meta.dirname, "./browser-cache-write.ts"),
  "utf8"
);
const browserCacheRemoveSource = readFileSync(
  resolve(import.meta.dirname, "./browser-cache-remove.ts"),
  "utf8"
);

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

  it("keeps browser cache responsibilities isolated in dedicated read/write/remove helpers", () => {
    expect(browserCacheReadSource).toContain("window.localStorage.getItem");
    expect(browserCacheReadSource).not.toContain("setItem(");
    expect(browserCacheReadSource).not.toContain("removeItem(");

    expect(browserCacheWriteSource).toContain("window.localStorage.setItem");
    expect(browserCacheWriteSource).not.toContain("getItem(");
    expect(browserCacheWriteSource).not.toContain("removeItem(");

    expect(browserCacheRemoveSource).toContain(
      "window.localStorage.removeItem"
    );
    expect(browserCacheRemoveSource).not.toContain("getItem(");
    expect(browserCacheRemoveSource).not.toContain("setItem(");
  });
});
