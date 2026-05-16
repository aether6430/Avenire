export type ExplorerMobileConfirmAction = "delete" | "move";

export function getExplorerMobileConfirmCopy(
  action: ExplorerMobileConfirmAction | null
) {
  if (!action) {
    return null;
  }

  return action === "delete"
    ? {
        confirmVariant: "destructive" as const,
        description: "This will remove the selected items.",
        title: "Delete items",
      }
    : {
        confirmVariant: "default" as const,
        description: "This will move the selected items up one folder.",
        title: "Move items",
      };
}
