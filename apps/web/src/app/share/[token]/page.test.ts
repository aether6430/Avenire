import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  canUserAccessSharedResourceMock,
  getFileAssetByIdMock,
  getFolderWithAncestorsMock,
  getMessagesByChatSlugMock,
  getSessionMock,
  headersMock,
  listFolderContentsMock,
  listWorkspacesForUserMock,
  notFoundMock,
  redirectMock,
  resolveResourceShareLinkMock,
  sharedResourceActionsMock,
} = vi.hoisted(() => ({
  canUserAccessSharedResourceMock: vi.fn(),
  getFileAssetByIdMock: vi.fn(),
  getFolderWithAncestorsMock: vi.fn(),
  getMessagesByChatSlugMock: vi.fn(),
  getSessionMock: vi.fn(),
  headersMock: vi.fn(async () => new Headers()),
  listFolderContentsMock: vi.fn(),
  listWorkspacesForUserMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("notFound");
  }),
  redirectMock: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
  resolveResourceShareLinkMock: vi.fn(),
  sharedResourceActionsMock: vi.fn(() => null),
}));

vi.mock("@avenire/auth/server", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) =>
    createElement("a", { href }, children),
}));

vi.mock("@/components/files/shared-resource-actions", () => ({
  SharedResourceActions: sharedResourceActionsMock,
}));

vi.mock("@/lib/chat-data", () => ({
  getMessagesByChatSlug: getMessagesByChatSlugMock,
}));

vi.mock("@/lib/file-data", () => ({
  canUserAccessSharedResource: canUserAccessSharedResourceMock,
  getFileAssetById: getFileAssetByIdMock,
  getFolderWithAncestors: getFolderWithAncestorsMock,
  listFolderContents: listFolderContentsMock,
  listWorkspacesForUser: listWorkspacesForUserMock,
  resolveResourceShareLink: resolveResourceShareLinkMock,
}));

import SharedResourcePage, { dynamic, generateMetadata } from "./page";

describe("SharedResourcePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the route explicitly request-driven", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("aligns file-share metadata with the visible allowed-state heading", async () => {
    resolveResourceShareLinkMock.mockResolvedValueOnce({
      resourceId: "file-1",
      resourceType: "file",
      workspaceId: "workspace-1",
    });
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    canUserAccessSharedResourceMock.mockResolvedValueOnce(true);
    getFileAssetByIdMock.mockResolvedValueOnce({
      id: "file-1",
      name: "Linear Algebra.pdf",
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ token: "token-1" }),
    });

    expect(metadata.title).toBe("Shared file — Avenire");
  });

  it("aligns denied-state metadata with the visible Access denied heading", async () => {
    resolveResourceShareLinkMock.mockResolvedValueOnce({
      resourceId: "folder-1",
      resourceType: "folder",
      workspaceId: "workspace-1",
    });
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    canUserAccessSharedResourceMock.mockResolvedValueOnce(false);

    const metadata = await generateMetadata({
      params: Promise.resolve({ token: "token-1" }),
    });

    expect(metadata.title).toBe("Access denied — Avenire");
  });

  it("publishes the not-found title when the share token cannot be resolved", async () => {
    resolveResourceShareLinkMock.mockResolvedValueOnce(null);

    const metadata = await generateMetadata({
      params: Promise.resolve({ token: "missing-token" }),
    });

    expect(metadata.title).toBe("This page isn't here. — Avenire");
  });

  it("publishes the not-found title when a shared file link points at a missing file", async () => {
    resolveResourceShareLinkMock.mockResolvedValueOnce({
      resourceId: "file-missing",
      resourceType: "file",
      workspaceId: "workspace-1",
    });
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    canUserAccessSharedResourceMock.mockResolvedValueOnce(true);
    getFileAssetByIdMock.mockResolvedValueOnce(null);

    const metadata = await generateMetadata({
      params: Promise.resolve({ token: "token-1" }),
    });

    expect(metadata.title).toBe("This page isn't here. — Avenire");
  });

  it("renders the shared method flow with a direct workspace-method entrypoint", async () => {
    resolveResourceShareLinkMock.mockResolvedValueOnce({
      resourceId: "chat-1",
      resourceType: "chat",
      workspaceId: "workspace-1",
    });
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    canUserAccessSharedResourceMock.mockResolvedValueOnce(true);
    getMessagesByChatSlugMock.mockResolvedValueOnce([]);

    const element = await SharedResourcePage({
      params: Promise.resolve({ token: "token-1" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("<h1");
    expect(html).toContain("Shared method");
    expect(html).toContain("No method messages yet.");
    expect(html).toContain('href="/workspace/chats/chat-1"');
    expect(html).toContain("Open method in workspace");
  });

  it("renders the Access denied heading for denied folder links", async () => {
    resolveResourceShareLinkMock.mockResolvedValueOnce({
      resourceId: "folder-1",
      resourceType: "folder",
      workspaceId: "workspace-1",
    });
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    listWorkspacesForUserMock.mockResolvedValueOnce([]);
    canUserAccessSharedResourceMock.mockResolvedValueOnce(false);

    const element = await SharedResourcePage({
      params: Promise.resolve({ token: "token-1" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("<h1");
    expect(html).toContain("Access denied");
    expect(html).toContain("You do not have access to this folder.");
  });

  it("renders the shared folder file list with an explicit Files heading", async () => {
    resolveResourceShareLinkMock.mockResolvedValueOnce({
      resourceId: "folder-1",
      resourceType: "folder",
      workspaceId: "workspace-1",
    });
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    listWorkspacesForUserMock.mockResolvedValueOnce([]);
    canUserAccessSharedResourceMock.mockResolvedValueOnce(true);
    getFolderWithAncestorsMock.mockResolvedValueOnce({
      folder: { id: "folder-1", name: "Course notes" },
    });
    listFolderContentsMock.mockResolvedValueOnce({
      files: [
        {
          id: "file-1",
          name: "Lecture 1.pdf",
          storageUrl: "https://example.com/lecture-1.pdf",
        },
      ],
      folders: [],
    });

    const element = await SharedResourcePage({
      params: Promise.resolve({ token: "token-1" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Folders");
    expect(html).toContain("Files");
    expect(html).not.toContain(">Manage<");
    expect(html).toContain("Lecture 1.pdf");
  });
});
