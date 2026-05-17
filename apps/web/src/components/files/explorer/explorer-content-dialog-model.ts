export interface ExplorerPropertiesItem {
  detail?: string;
  id: string;
  kind: "file" | "folder";
  name: string;
}

export interface ExplorerEditDialogState {
  id?: string;
  mode: "create-folder" | "create-note" | "rename-file" | "rename-folder";
  parentId?: string;
  value: string;
}

export interface ExplorerLinkImportDialogState {
  folderId: string;
  name: string;
  url: string;
}

export function getExplorerEditDialogCopy(
  dialog: ExplorerEditDialogState | null
) {
  if (!dialog) {
    return null;
  }

  return {
    description:
      dialog.mode === "create-folder"
        ? "Choose a name for the new folder."
        : dialog.mode === "create-note"
          ? "Choose a name for the new note."
          : "Update the item name.",
    title:
      dialog.mode === "create-folder"
        ? "Create folder"
        : dialog.mode === "create-note"
          ? "Create note"
          : dialog.mode === "rename-folder"
            ? "Rename folder"
            : "Rename file",
  };
}

export function getExplorerPropertiesRows(item: ExplorerPropertiesItem | null) {
  if (!item) {
    return [];
  }

  return [
    { label: "Name", value: item.name },
    { label: "Type", value: item.kind },
    { label: "ID", value: item.id },
    ...(item.detail ? [{ label: "Detail", value: item.detail }] : []),
  ];
}
