function normalizeTitlePart(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveWorkspaceFilesPageTitle(input: {
  folderName?: string | null;
  isAtWorkspaceRoot?: boolean;
  workspaceName?: string | null;
}) {
  const workspaceName = normalizeTitlePart(input.workspaceName);
  const folderName = normalizeTitlePart(input.folderName);

  if (input.isAtWorkspaceRoot) {
    return workspaceName ?? folderName ?? "Files";
  }

  return folderName ?? workspaceName ?? "Files";
}
