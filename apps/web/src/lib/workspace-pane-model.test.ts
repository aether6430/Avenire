import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildRouteState,
  clearWorkspacePaneDragData,
  getWorkspacePaneDragHref,
  hasWorkspacePaneDragHref,
  isInternalWorkspaceHref,
  normalizeHref,
  setWorkspacePaneDragData,
} from "@/lib/workspace-pane-model";

function createDataTransferMock() {
  const store = new Map<string, string>();
  return {
    effectAllowed: "",
    getData: (type: string) => store.get(type) ?? "",
    setData: (type: string, value: string) => {
      store.set(type, value);
    },
  } as DataTransfer;
}

describe("workspace pane model", () => {
  beforeEach(() => {
    clearWorkspacePaneDragData();
    vi.stubGlobal("window", {
      location: { origin: "https://app.example.com" },
    });
  });

  it("normalizes internal hrefs and route state", () => {
    expect(normalizeHref("https://app.example.com/workspace/files?id=1")).toBe(
      "/workspace/files?id=1"
    );
    expect(
      buildRouteState("https://app.example.com/workspace/files?id=1")
    ).toEqual({
      pathname: "/workspace/files",
      search: "?id=1",
    });
    expect(isInternalWorkspaceHref("/workspace/files")).toBe(true);
    expect(isInternalWorkspaceHref("/about")).toBe(false);
  });

  it("stores and resolves drag hrefs across supported mime types", () => {
    const dataTransfer = createDataTransferMock();

    setWorkspacePaneDragData(
      dataTransfer,
      "https://app.example.com/workspace/chats/example"
    );

    expect(hasWorkspacePaneDragHref(dataTransfer)).toBe(true);
    expect(getWorkspacePaneDragHref(dataTransfer)).toBe(
      "/workspace/chats/example"
    );

    clearWorkspacePaneDragData();
    expect(getWorkspacePaneDragHref(dataTransfer)).toBe(
      "/workspace/chats/example"
    );
  });

  it("fails closed for missing or external drag hrefs", () => {
    const dataTransfer = createDataTransferMock();
    expect(getWorkspacePaneDragHref(dataTransfer)).toBeNull();

    dataTransfer.setData("text/plain", "https://example.com");
    expect(getWorkspacePaneDragHref(dataTransfer)).toBeNull();
  });
});
