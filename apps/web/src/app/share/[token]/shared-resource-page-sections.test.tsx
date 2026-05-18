import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { sharedResourceActionsMock } = vi.hoisted(() => ({
  sharedResourceActionsMock: vi.fn(() =>
    createElement("div", { "data-shared-resource-actions": "1" })
  ),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) =>
    createElement("a", { href }, children),
}));

vi.mock("@/components/files/shared-resource-actions", () => ({
  SharedResourceActions: sharedResourceActionsMock,
}));

import {
  SharedFileResourcePage,
  SharedFolderResourcePage,
  SharedMethodResourcePage,
  SharedResourceAccessDeniedPage,
} from "./shared-resource-page-sections";

describe("shared resource page sections", () => {
  it("renders the access denied state with the resource label", () => {
    const html = renderToStaticMarkup(
      <SharedResourceAccessDeniedPage
        heading="Access denied"
        resourceLabel="folder"
      />
    );

    expect(html).toContain("Access denied");
    expect(html).toContain("You do not have access to this folder.");
  });

  it("renders the shared file page with the file action surface", () => {
    const html = renderToStaticMarkup(
      <SharedFileResourcePage
        fileName="Linear Algebra.pdf"
        heading="Shared file"
        storageUrl="https://cdn.avenire.app/file.pdf"
        token="token-1"
        workspaces={[
          {
            name: "Aveniri",
            organizationId: "org-1",
            rootFolderId: "root-1",
            workspaceId: "workspace-1",
          },
        ]}
      />
    );

    expect(html).toContain("Shared file");
    expect(html).toContain("Linear Algebra.pdf");
    expect(html).toContain('href="https://cdn.avenire.app/file.pdf"');
    expect(html).toContain("Open file");
    expect(html).toContain('data-shared-resource-actions="1"');
  });

  it("renders method empty state and non-text fallback content", () => {
    const emptyHtml = renderToStaticMarkup(
      <SharedMethodResourcePage
        heading="Shared method"
        messages={[]}
        workspaceHref={"/workspace/chats/chat-1"}
      />
    );

    expect(emptyHtml).toContain("No method messages yet.");
    expect(emptyHtml).toContain("Open method in workspace");

    const nonTextHtml = renderToStaticMarkup(
      <SharedMethodResourcePage
        heading="Shared method"
        messages={[
          {
            id: "assistant-1",
            parts: [{ type: "tool-call" }],
            role: "assistant",
          },
        ]}
        workspaceHref={"/workspace/chats/chat-1"}
      />
    );

    expect(nonTextHtml).toContain("assistant");
    expect(nonTextHtml).toContain("[non-text content]");
  });

  it("renders shared folder empty states and linked file entries", () => {
    const emptyHtml = renderToStaticMarkup(
      <SharedFolderResourcePage
        files={[]}
        folderName="Course notes"
        folders={[]}
        heading="Shared folder"
        token="token-1"
        workspaces={[
          {
            name: "Aveniri",
            organizationId: "org-1",
            rootFolderId: "root-1",
            workspaceId: "workspace-1",
          },
        ]}
      />
    );

    expect(emptyHtml).toContain("No subfolders yet.");
    expect(emptyHtml).toContain("No files yet.");
    expect(emptyHtml).toContain('data-shared-resource-actions="1"');

    const filledHtml = renderToStaticMarkup(
      <SharedFolderResourcePage
        files={[
          {
            id: "file-1",
            name: "Lecture 1.pdf",
            storageUrl: "https://cdn.avenire.app/lecture-1.pdf",
          },
        ]}
        folderName="Course notes"
        folders={[
          {
            id: "folder-1",
            name: "Week 1",
          },
        ]}
        heading="Shared folder"
        token="token-1"
        workspaces={[
          {
            name: "Aveniri",
            organizationId: "org-1",
            rootFolderId: "root-1",
            workspaceId: "workspace-1",
          },
        ]}
      />
    );

    expect(filledHtml).toContain("[Folder] Week 1");
    expect(filledHtml).toContain(
      'href="https://cdn.avenire.app/lecture-1.pdf"'
    );
    expect(filledHtml).toContain("Lecture 1.pdf");
  });
});
