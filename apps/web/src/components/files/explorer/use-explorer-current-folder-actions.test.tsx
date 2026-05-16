import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { useExplorerCurrentFolderActions } from "@/components/files/explorer/use-explorer-current-folder-actions";

type HookValue = ReturnType<typeof useExplorerCurrentFolderActions>;

function renderHookValue(
  options: Parameters<typeof useExplorerCurrentFolderActions>[0]
) {
  let hookValue: HookValue | null = null;

  function Probe() {
    hookValue = useExplorerCurrentFolderActions(options);
    return null;
  }

  renderToStaticMarkup(<Probe />);

  if (!hookValue) {
    throw new Error("Hook value was not captured.");
  }

  return hookValue;
}

describe("useExplorerCurrentFolderActions", () => {
  it("wires all folder actions when a current folder exists", () => {
    const deleteSelectionItems = vi.fn();
    const downloadItemArchive = vi.fn();
    const duplicateItem = vi.fn();
    const moveFolder = vi.fn();
    const openFolderShareDialog = vi.fn();
    const openPane = vi.fn();
    const openRenameFolderDialog = vi.fn();
    const setPropertiesItem = vi.fn();
    const setPropertiesOpen = vi.fn();

    const currentFolder = {
      id: "folder_123",
      kind: "folder",
      name: "Notes",
      parentId: "folder_parent",
      readOnly: false,
    } as const;

    const hook = renderHookValue({
      currentFolder,
      deleteSelectionItems,
      downloadItemArchive,
      duplicateItem,
      moveFolder,
      openFolderShareDialog,
      openPane,
      openRenameFolderDialog,
      paneId: "pane_123",
      setPropertiesItem,
      setPropertiesOpen,
    });

    hook.openCurrentFolderProperties();
    hook.openCurrentFolderRename();
    hook.duplicateCurrentFolder();
    hook.shareCurrentFolder();
    hook.moveCurrentFolderTo("folder_target");
    hook.downloadCurrentFolder();
    hook.deleteCurrentFolder();
    hook.openPaneRight();

    expect(setPropertiesItem).toHaveBeenCalledWith({
      detail: "Folder",
      id: "folder_123",
      kind: "folder",
      name: "Notes",
    });
    expect(setPropertiesOpen).toHaveBeenCalledWith(true);
    expect(openRenameFolderDialog).toHaveBeenCalledWith(currentFolder);
    expect(duplicateItem).toHaveBeenCalledWith({
      id: "folder_123",
      kind: "folder",
      parentId: "folder_parent",
    });
    expect(openFolderShareDialog).toHaveBeenCalledWith(currentFolder);
    expect(moveFolder).toHaveBeenCalledWith("folder_123", "folder_target");
    expect(downloadItemArchive).toHaveBeenCalledWith({
      id: "folder_123",
      kind: "folder",
      name: "Notes",
    });
    expect(deleteSelectionItems).toHaveBeenCalledWith([
      { id: "folder_123", kind: "folder" },
    ]);
    expect(openPane).toHaveBeenCalledWith("/workspace", {
      sourcePaneId: "pane_123",
      splitDirection: "horizontal",
      splitPlacement: "after",
    });
  });

  it("fails closed when there is no current folder", () => {
    const deleteSelectionItems = vi.fn();
    const downloadItemArchive = vi.fn();
    const duplicateItem = vi.fn();
    const moveFolder = vi.fn();
    const openFolderShareDialog = vi.fn();
    const openPane = vi.fn();
    const openRenameFolderDialog = vi.fn();
    const setPropertiesItem = vi.fn();
    const setPropertiesOpen = vi.fn();

    const hook = renderHookValue({
      currentFolder: null,
      deleteSelectionItems,
      downloadItemArchive,
      duplicateItem,
      moveFolder,
      openFolderShareDialog,
      openPane,
      openRenameFolderDialog,
      paneId: "pane_123",
      setPropertiesItem,
      setPropertiesOpen,
    });

    hook.openCurrentFolderProperties();
    hook.openCurrentFolderRename();
    hook.duplicateCurrentFolder();
    hook.shareCurrentFolder();
    hook.moveCurrentFolderTo("folder_target");
    hook.downloadCurrentFolder();
    hook.deleteCurrentFolder();

    expect(setPropertiesItem).not.toHaveBeenCalled();
    expect(setPropertiesOpen).not.toHaveBeenCalled();
    expect(openRenameFolderDialog).not.toHaveBeenCalled();
    expect(duplicateItem).not.toHaveBeenCalled();
    expect(openFolderShareDialog).not.toHaveBeenCalled();
    expect(moveFolder).not.toHaveBeenCalled();
    expect(downloadItemArchive).not.toHaveBeenCalled();
    expect(deleteSelectionItems).not.toHaveBeenCalled();
  });
});
