import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { useExplorerNoteWorkflows } from "@/components/files/explorer/use-explorer-note-workflows";

type HookValue = ReturnType<typeof useExplorerNoteWorkflows>;

function renderHookValue(
  options: Parameters<typeof useExplorerNoteWorkflows>[0]
) {
  let hookValue: HookValue | null = null;

  function Probe() {
    hookValue = useExplorerNoteWorkflows(options);
    return null;
  }

  renderToStaticMarkup(<Probe />);

  if (!hookValue) {
    throw new Error("Hook value was not captured.");
  }

  return hookValue;
}

describe("useExplorerNoteWorkflows", () => {
  it("creates a markdown note and opens it in the target folder", async () => {
    const openWorkspaceFileInFolder = vi.fn();
    const onNoteCreated = vi.fn(async () => undefined);
    const createdFile = {
      id: "file_123",
      name: "Lecture 1.md",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        file: createdFile,
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const hook = renderHookValue({
      isCurrentFolderReadOnly: false,
      onNoteCreated,
      openWorkspaceFileInFolder,
      workspaceUuid: "workspace_123",
    });

    await hook.createNote("folder_123", "Lecture 1");

    const requestInit = fetchMock.mock.calls[0]?.[1];

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/workspaces/workspace_123/files/register",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      })
    );
    expect(JSON.parse(String(requestInit?.body))).toEqual({
      content: "# Lecture 1\n",
      folderId: "folder_123",
      metadata: {
        type: "note",
      },
      name: "Lecture 1.md",
    });
    expect(openWorkspaceFileInFolder).toHaveBeenCalledWith(
      "folder_123",
      "file_123"
    );
    expect(onNoteCreated).toHaveBeenCalledWith(createdFile);
    expect(onNoteCreated.mock.invocationCallOrder[0]).toBeLessThan(
      openWorkspaceFileInFolder.mock.invocationCallOrder[0] ?? 0
    );
  });

  it("fails closed on blank note names", async () => {
    const openWorkspaceFileInFolder = vi.fn();
    const fetchMock = vi.fn();

    vi.stubGlobal("fetch", fetchMock);

    const hook = renderHookValue({
      isCurrentFolderReadOnly: false,
      openWorkspaceFileInFolder,
      workspaceUuid: "workspace_123",
    });

    await hook.createNote("folder_123", "   ");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(openWorkspaceFileInFolder).not.toHaveBeenCalled();
  });
});
