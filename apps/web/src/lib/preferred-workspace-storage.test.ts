import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PREFERRED_WORKSPACE_ID_STORAGE_KEY,
  readPreferredWorkspaceId,
  writePreferredWorkspaceId,
} from "./preferred-workspace-storage";

class StorageEventMock extends Event {
  key: string | null;

  constructor(type: string, init?: { key?: string | null }) {
    super(type);
    this.key = init?.key ?? null;
  }
}

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

function createWindowMock(initialEntries: Record<string, string> = {}) {
  const eventTarget = new EventTarget();

  return {
    addEventListener: eventTarget.addEventListener.bind(eventTarget),
    dispatchEvent: eventTarget.dispatchEvent.bind(eventTarget),
    localStorage: createLocalStorageMock(initialEntries),
    removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
  };
}

describe("preferred workspace storage", () => {
  beforeEach(() => {
    vi.stubGlobal("StorageEvent", StorageEventMock);
    vi.stubGlobal("window", createWindowMock());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("reads legacy raw string values", () => {
    window.localStorage.setItem(
      PREFERRED_WORKSPACE_ID_STORAGE_KEY,
      "workspace-1"
    );

    expect(readPreferredWorkspaceId()).toBe("workspace-1");
  });

  it("reads JSON serialized string values", () => {
    window.localStorage.setItem(
      PREFERRED_WORKSPACE_ID_STORAGE_KEY,
      '"workspace-1"'
    );

    expect(readPreferredWorkspaceId()).toBe("workspace-1");
  });

  it("fails closed for structured payloads", () => {
    window.localStorage.setItem(
      PREFERRED_WORKSPACE_ID_STORAGE_KEY,
      '{"workspaceId":"workspace-1"}'
    );

    expect(readPreferredWorkspaceId()).toBeNull();
  });

  it("writes trimmed JSON string values and dispatches a local-storage event", () => {
    const listener = vi.fn();
    window.addEventListener("local-storage", listener);

    writePreferredWorkspaceId("  workspace-1  ");

    expect(
      window.localStorage.getItem(PREFERRED_WORKSPACE_ID_STORAGE_KEY)
    ).toBe('"workspace-1"');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("removes empty values and dispatches a local-storage event", () => {
    const listener = vi.fn();
    window.localStorage.setItem(
      PREFERRED_WORKSPACE_ID_STORAGE_KEY,
      '"keep-me"'
    );
    window.addEventListener("local-storage", listener);

    writePreferredWorkspaceId("   ");

    expect(
      window.localStorage.getItem(PREFERRED_WORKSPACE_ID_STORAGE_KEY)
    ).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
