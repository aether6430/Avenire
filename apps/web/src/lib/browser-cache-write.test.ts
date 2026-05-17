import { afterEach, describe, expect, it, vi } from "vitest";
import { writeBrowserCache } from "@/lib/browser-cache-write";

function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();

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

describe("browser cache write", () => {
  it("no-ops when window is unavailable", () => {
    expect(() =>
      writeBrowserCache("avenire:test", {
        value: "ready",
      })
    ).not.toThrow();
  });

  it("serializes payloads into local storage", () => {
    vi.stubGlobal("window", {
      localStorage: createLocalStorageMock(),
    });

    writeBrowserCache("avenire:test", {
      cachedAt: 123,
      value: "ready",
    });

    expect(window.localStorage.getItem("avenire:test")).toBe(
      '{"cachedAt":123,"value":"ready"}'
    );
  });

  it("swallows local storage write failures", () => {
    vi.stubGlobal("window", {
      localStorage: {
        setItem() {
          throw new Error("quota");
        },
      },
    });

    expect(() =>
      writeBrowserCache("avenire:test", {
        value: "ready",
      })
    ).not.toThrow();
  });
});
