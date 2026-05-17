import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@avenire/ui/components/button", () => ({
  Button: ({ children, ...props }: { children: ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@avenire/ui/components/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@avenire/ui/components/avatar", () => ({
  Avatar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@avenire/ui/components/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@avenire/ui/components/label", () => ({
  Label: ({ children, ...props }: { children: ReactNode }) => (
    <label {...props}>{children}</label>
  ),
}));

vi.mock("@/components/shared/email-suggestion-input", () => ({
  EmailSuggestionInput: ({
    onValueChange,
    value,
    ...props
  }: Record<string, unknown>) => (
    <input
      {...props}
      onChange={(event) =>
        typeof onValueChange === "function"
          ? onValueChange((event.target as HTMLInputElement).value)
          : undefined
      }
      value={typeof value === "string" ? value : ""}
    />
  ),
}));

vi.mock("@/components/files/explorer/use-share-suggestion-list", () => ({
  useShareSuggestionList: () => ({
    requestSuggestions: () => {},
    suggestions: [],
  }),
}));

import { ShareDialog } from "@/components/files/explorer/share-dialog";
import { ShareDialogFileContent } from "@/components/files/explorer/share-dialog-file-content";
import { ShareDialogFolderContent } from "@/components/files/explorer/share-dialog-folder-content";
import { ShareDialogWorkspaceContent } from "@/components/files/explorer/share-dialog-workspace-content";

describe("Share dialog copy", () => {
  it("uses explicit file-sharing wording in the file dialog", () => {
    const html = renderToStaticMarkup(
      <ShareDialogFileContent
        activeFile={
          {
            id: "file-1",
            name: "Linear Algebra.pdf",
            readOnly: false,
          } as never
        }
        loadShareSuggestions={() => {}}
        open
        workspaceUuid="workspace-1"
      />
    );

    expect(html).toContain("Share file");
    expect(html).toContain("Share with people");
    expect(html).toContain("Grant access");
    expect(html).toContain("Generate link");
    expect(html).toContain("Copy link");
    expect(html).not.toContain("Add people");
    expect(html).not.toContain(">Add<");
    expect(html).not.toContain(">Generate<");
    expect(html).not.toContain(">Copy<");
  });

  it("uses explicit folder-sharing wording in the folder dialog", () => {
    const html = renderToStaticMarkup(
      <ShareDialogFolderContent
        currentFolder={
          {
            id: "folder-1",
            name: "Physics",
            readOnly: false,
          } as never
        }
        loadShareSuggestions={() => {}}
        open
        workspaceUuid="workspace-1"
      />
    );

    expect(html).toContain("Share folder");
    expect(html).toContain("Share with people");
    expect(html).toContain("Grant access");
    expect(html).toContain("Folder share link (7 days)");
    expect(html).toContain("Generate link");
    expect(html).toContain("Copy link");
    expect(html).not.toContain("Add people");
    expect(html).not.toContain(">Add<");
    expect(html).not.toContain(">Generate<");
    expect(html).not.toContain(">Copy<");
  });

  it("uses explicit workspace-sharing wording in the workspace dialog", () => {
    const html = renderToStaticMarkup(
      <ShareDialogWorkspaceContent
        loadShareSuggestions={() => {}}
        open
        workspaceUuid="workspace-1"
      />
    );

    expect(html).toContain("Share workspace");
    expect(html).toContain("Share workspace access by email");
    expect(html).toContain("Share with teammates");
    expect(html).toContain("Grant access");
    expect(html).toContain("Notify workspace team");
    expect(html).not.toContain("Invite teammates");
    expect(html).not.toContain(">Add<");
    expect(html).not.toContain("Notify whole team");
  });

  it("keeps the public share dialog routed to the file content owner", () => {
    const html = renderToStaticMarkup(
      <ShareDialog
        activeFile={
          {
            id: "file-1",
            name: "Linear Algebra.pdf",
            readOnly: false,
          } as never
        }
        loadShareSuggestions={() => {}}
        open
        variant="file"
        workspaceUuid="workspace-1"
      />
    );

    expect(html).toContain("Share file");
    expect(html).toContain("Share with people");
  });

  it("does not render a share surface for read-only files", () => {
    const html = renderToStaticMarkup(
      <ShareDialog
        activeFile={
          {
            id: "file-readonly",
            name: "Readonly.pdf",
            readOnly: true,
          } as never
        }
        loadShareSuggestions={() => {}}
        open
        variant="file"
        workspaceUuid="workspace-1"
      />
    );

    expect(html).toBe("");
  });
});
