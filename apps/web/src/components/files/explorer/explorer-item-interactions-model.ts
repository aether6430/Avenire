interface ExplorerMobileItemClickBehaviorOptions {
  isSuppressed: boolean;
  selectedCount: number;
  toggleOnly?: boolean;
}

interface ExplorerContextActionSelectionOptions {
  itemId: string;
  selectedIds: string[];
}

interface ExplorerDoubleClickOptions {
  clickDetail: number;
  isActionTarget: boolean;
}

export function resolveExplorerMobileItemClickBehavior({
  isSuppressed,
  selectedCount,
  toggleOnly = false,
}: ExplorerMobileItemClickBehaviorOptions) {
  if (isSuppressed) {
    return "ignore" as const;
  }

  if (selectedCount > 0 || toggleOnly) {
    return "toggle" as const;
  }

  return "open" as const;
}

export function resolveExplorerContextActionSelection({
  itemId,
  selectedIds,
}: ExplorerContextActionSelectionOptions) {
  if (selectedIds.includes(itemId)) {
    return {
      ids: selectedIds,
      shouldResetSelection: false,
    };
  }

  return {
    ids: [itemId],
    shouldResetSelection: true,
  };
}

export function shouldOpenExplorerItemOnDoubleClick({
  clickDetail,
  isActionTarget,
}: ExplorerDoubleClickOptions) {
  return clickDetail === 2 && !isActionTarget;
}
