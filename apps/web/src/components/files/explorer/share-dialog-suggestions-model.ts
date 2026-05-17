export function shouldLoadShareSuggestions(input: {
  isAtWorkspaceRoot: boolean;
  open: boolean;
  scope: "file" | "folder" | "workspace";
  variant: "file" | "folder";
  workspaceUuid: string;
}) {
  if (!(input.open && input.workspaceUuid)) {
    return false;
  }

  if (input.scope === "file") {
    return input.variant === "file";
  }

  if (input.scope === "workspace") {
    return input.variant === "folder";
  }

  return input.variant === "folder" && !input.isAtWorkspaceRoot;
}
