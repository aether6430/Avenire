import type { SortState } from "@/components/files/explorer/workspace-folder-browse-model";

export const EXPLORER_MAX_VISIBLE_CARD_PROPERTIES = 4;
export const EXPLORER_DEFAULT_VISIBLE_CARD_PROPERTIES = 3;

export const EXPLORER_SORT_BUILTIN_OPTIONS = [
  { key: "name", label: "Name" },
  { key: "createdAt", label: "Date created" },
  { key: "updatedAt", label: "Date updated" },
] as const;

export function getExplorerSortFieldLabel(sortState: SortState) {
  switch (sortState.kind) {
    case "builtin": {
      const option = EXPLORER_SORT_BUILTIN_OPTIONS.find(
        (entry) => entry.key === sortState.key
      );
      return option?.key === "createdAt"
        ? "Created"
        : option?.key === "updatedAt"
          ? "Updated"
          : (option?.label ?? "Name");
    }
    case "property":
      return sortState.key;
  }
}

export function getExplorerSortDirectionLabel(
  direction: SortState["direction"]
) {
  return direction === "asc" ? "Asc" : "Desc";
}
