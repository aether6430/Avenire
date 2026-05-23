import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { useExplorerNavigation } from "@/components/files/explorer/use-explorer-navigation";

type HookValue = ReturnType<typeof useExplorerNavigation>;

function renderHookValue(options: Parameters<typeof useExplorerNavigation>[0]) {
  let hookValue: HookValue | null = null;

  function Probe() {
    hookValue = useExplorerNavigation(options);
    return null;
  }

  renderToStaticMarkup(<Probe />);

  if (!hookValue) {
    throw new Error("Hook value was not captured.");
  }

  return hookValue;
}

describe("useExplorerNavigation", () => {
  it("routes file selection and folder navigation through the provided router", () => {
    const prefetch = vi.fn();
    const push = vi.fn();
    const replace = vi.fn();

    const hook = renderHookValue({
      allFiles: [
        {
          folderId: "folder_b",
          id: "file_b",
          name: "Lecture.md",
        },
      ] as any,
      currentFolderId: "folder_a",
      router: {
        prefetch,
        push,
        replace,
      },
      searchParams: {
        toString: () => "pane=right",
      },
      workspaceUuid: "workspace_123",
    });

    hook.navigateToFolder("folder_b");
    hook.selectFile("file_b", {
      retrievalChunkId: "chunk_1",
    });
    hook.openFileById("file_b");

    expect(prefetch).toHaveBeenCalledWith(
      "/workspace/files/workspace_123/folder/folder_b"
    );
    expect(push).toHaveBeenCalledWith(
      "/workspace/files/workspace_123/folder/folder_b"
    );
    expect(replace).toHaveBeenCalledWith(
      "/workspace/files/workspace_123/folder/folder_a?pane=right&file=file_b&retrievalChunk=chunk_1"
    );
    expect(push).toHaveBeenCalledWith(
      "/workspace/files/workspace_123/folder/folder_b?file=file_b"
    );
  });

  it("opens search results in the resolved target folder", () => {
    const prefetch = vi.fn();
    const push = vi.fn();

    const hook = renderHookValue({
      allFiles: [
        {
          folderId: "folder_target",
          id: "file_hit",
          name: "Reference.pdf",
        },
      ] as any,
      currentFolderId: "folder_current",
      router: {
        prefetch,
        push,
        replace: vi.fn(),
      },
      searchParams: {
        toString: () => "",
      },
      workspaceUuid: "workspace_123",
    });

    hook.openSearchResult({
      chunkId: "chunk_42",
      fileId: "file_hit",
      id: "result_1",
      type: "file",
    } as any);

    expect(prefetch).toHaveBeenCalledWith(
      "/workspace/files/workspace_123/folder/folder_target?file=file_hit&retrievalChunk=chunk_42"
    );
    expect(push).toHaveBeenCalledWith(
      "/workspace/files/workspace_123/folder/folder_target?file=file_hit&retrievalChunk=chunk_42"
    );
  });
});
