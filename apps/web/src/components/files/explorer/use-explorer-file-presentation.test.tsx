import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { useExplorerFilePresentation } from "@/components/files/explorer/use-explorer-file-presentation";
import { createWorkspaceFileIndex } from "@/lib/workspace-file-index";

type HookValue = ReturnType<typeof useExplorerFilePresentation>;

function renderHookValue(
  options: Parameters<typeof useExplorerFilePresentation>[0]
) {
  let hookValue: HookValue | null = null;

  function Probe() {
    hookValue = useExplorerFilePresentation(options);
    return null;
  }

  renderToStaticMarkup(<Probe />);

  if (!hookValue) {
    throw new Error("Hook value was not captured.");
  }

  return hookValue;
}

describe("useExplorerFilePresentation", () => {
  it("builds wiki-linkable files from the workspace file index", () => {
    const workspaceFileIndex = createWorkspaceFileIndex({
      files: [
        {
          folderId: "folder_notes",
          id: "file_note",
          mimeType: "text/markdown",
          name: "Lecture 1.md",
        },
        {
          folderId: "folder_media",
          id: "file_video",
          mimeType: "video/mp4",
          name: "Session.mp4",
        },
      ] as any,
      folders: [
        {
          id: "workspace_root",
          name: "Workspace",
          parentId: null,
        },
        {
          id: "folder_notes",
          name: "Notes",
          parentId: "workspace_root",
        },
        {
          id: "folder_media",
          name: "Media",
          parentId: "workspace_root",
        },
      ] as any,
    });

    const hook = renderHookValue({ workspaceFileIndex });

    expect(hook.wikiLinkableFiles).toEqual(
      expect.arrayContaining([
        {
          content: "",
          excerpt: "Notes/Lecture 1.md",
          id: "file_note",
          title: "Lecture 1",
        },
        {
          content: "",
          excerpt: "Media/Session.mp4",
          id: "file_video",
          title: "Session.mp4",
        },
      ])
    );
  });

  it("exposes stable file-kind helpers from the hook", () => {
    const workspaceFileIndex = createWorkspaceFileIndex({
      files: [] as any,
      folders: [] as any,
    });

    const hook = renderHookValue({ workspaceFileIndex });

    expect(
      hook.detectFileKind({ mimeType: "video/mp4", name: "video.mp4" } as any)
    ).toBe("video");
    expect(
      hook.detectFileKind({
        mimeType: "text/markdown",
        name: "document.md",
      } as any)
    ).toBe("document");
  });
});
