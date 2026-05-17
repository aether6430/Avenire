import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@avenire/ui/components/button", () => ({
  Button: ({ children, ...props }: { children?: ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@avenire/ui/components/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/files/explorer/share-dialog-file-content", () => ({
  ShareDialogFileContent: () => <div>FILE_CONTENT</div>,
}));

vi.mock("@/components/files/explorer/share-dialog-folder-content", () => ({
  ShareDialogFolderContent: () => <div>FOLDER_CONTENT</div>,
}));

vi.mock("@/components/files/explorer/share-dialog-workspace-content", () => ({
  ShareDialogWorkspaceContent: () => <div>WORKSPACE_CONTENT</div>,
}));

import { ShareDialog } from "@/components/files/explorer/share-dialog";

describe("ShareDialog", () => {
  it("fails closed for read-only files", () => {
    const html = renderToStaticMarkup(
      <ShareDialog
        activeFile={{ id: "file-1", name: "Locked", readOnly: true } as never}
        loadShareSuggestions={() => {}}
        open
        variant="file"
        workspaceUuid="workspace-1"
      />
    );

    expect(html).toBe("");
  });

  it("routes file dialogs to the file content surface", () => {
    const html = renderToStaticMarkup(
      <ShareDialog
        activeFile={{ id: "file-1", name: "Open", readOnly: false } as never}
        loadShareSuggestions={() => {}}
        open
        variant="file"
        workspaceUuid="workspace-1"
      />
    );

    expect(html).toContain("FILE_CONTENT");
    expect(html).not.toContain("FOLDER_CONTENT");
    expect(html).not.toContain("WORKSPACE_CONTENT");
  });

  it("routes root folder dialogs to workspace content and nested folders to folder content", () => {
    const workspaceHtml = renderToStaticMarkup(
      <ShareDialog
        isAtWorkspaceRoot
        loadShareSuggestions={() => {}}
        open
        variant="folder"
        workspaceUuid="workspace-1"
      />
    );
    const folderHtml = renderToStaticMarkup(
      <ShareDialog
        currentFolder={
          { id: "folder-1", name: "Physics", readOnly: false } as never
        }
        loadShareSuggestions={() => {}}
        open
        variant="folder"
        workspaceUuid="workspace-1"
      />
    );

    expect(workspaceHtml).toContain("WORKSPACE_CONTENT");
    expect(workspaceHtml).not.toContain("FOLDER_CONTENT");
    expect(folderHtml).toContain("FOLDER_CONTENT");
    expect(folderHtml).not.toContain("WORKSPACE_CONTENT");
  });
});
