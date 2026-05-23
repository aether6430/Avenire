import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const removedHelperFile = resolve(
  import.meta.dirname,
  "./share-dialog-suggestions-model.ts"
);
const shareDialogFile = resolve(import.meta.dirname, "./share-dialog.tsx");
const useShareSuggestionListFile = resolve(
  import.meta.dirname,
  "./use-share-suggestion-list.ts"
);
const useExplorerShareDialogsFile = resolve(
  import.meta.dirname,
  "./use-explorer-share-dialogs.ts"
);

describe("share dialog suggestions model", () => {
  it("keeps the live suggestion hook fail-closed when the dialog is disabled or the workspace is missing", () => {
    const source = readFileSync(useShareSuggestionListFile, "utf8");

    expect(source).toContain("if (!(enabled && workspaceUuid))");
    expect(source).toContain("setSuggestions([]);");
    expect(source).toContain(
      "void loadShareSuggestions(query, setSuggestions);"
    );
  });

  it("keeps the live share dialog and explorer share hook routing suggestions through the current file/folder/workspace branches", () => {
    const shareDialogSource = readFileSync(shareDialogFile, "utf8");
    const shareDialogsSource = readFileSync(
      useExplorerShareDialogsFile,
      "utf8"
    );

    expect(shareDialogSource).toContain('variant === "file"');
    expect(shareDialogSource).toContain("<ShareDialogFileContent");
    expect(shareDialogSource).toContain("<ShareDialogWorkspaceContent");
    expect(shareDialogSource).toContain("<ShareDialogFolderContent");
    expect(shareDialogsSource).toContain("if (!workspaceUuid)");
    expect(shareDialogsSource).toContain("onResult([]);");
  });

  it("keeps the dead suggestions helper removed", () => {
    expect(existsSync(removedHelperFile)).toBe(false);
  });
});
