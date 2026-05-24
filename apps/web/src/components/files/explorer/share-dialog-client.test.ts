import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createFileShareLink,
  createFolderShareLink,
  grantFileShareAccess,
  grantFolderShareAccess,
  loadWorkspaceShareMembers,
  notifyWorkspaceShareTeam,
  shareWorkspaceMemberAccess,
} from "@/components/files/explorer/share-dialog-client";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(payload === null ? null : JSON.stringify(payload), {
    status,
  });
}

describe("Share dialog client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the expected share endpoints for file and folder access", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(null))
      .mockResolvedValueOnce(jsonResponse({ shareUrl: "https://share/file" }))
      .mockResolvedValueOnce(jsonResponse({ shareUrl: "https://share/folder" }))
      .mockResolvedValueOnce(
        jsonResponse({ shareUrl: "https://share/folder-2" })
      );

    const successCases = [
      {
        run: () =>
          grantFileShareAccess({
            email: "dev@avenire.local",
            fileId: "file-1",
            permission: "editor",
            workspaceUuid: "workspace-1",
          }),
        expected: { ok: true },
        request: [
          "/api/workspaces/workspace-1/files/file-1/share/grants",
          expect.objectContaining({ method: "POST" }),
        ] as const,
      },
      {
        run: () =>
          createFileShareLink({
            fileId: "file-1",
            workspaceUuid: "workspace-1",
          }),
        expected: { ok: true, shareUrl: "https://share/file" },
        request: [
          "/api/workspaces/workspace-1/files/file-1/share/link",
          expect.objectContaining({ method: "POST" }),
        ] as const,
      },
      {
        run: () =>
          grantFolderShareAccess({
            email: "dev@avenire.local",
            folderId: "folder-1",
            permission: "viewer",
            workspaceUuid: "workspace-1",
          }),
        expected: { ok: true, shareUrl: "https://share/folder" },
        request: [
          "/api/workspaces/workspace-1/folders/folder-1/share/grants",
          expect.objectContaining({ method: "POST" }),
        ] as const,
      },
      {
        run: () =>
          createFolderShareLink({
            folderId: "folder-1",
            workspaceUuid: "workspace-1",
          }),
        expected: { ok: true, shareUrl: "https://share/folder-2" },
        request: [
          "/api/workspaces/workspace-1/folders/folder-1/share/link",
          expect.objectContaining({ method: "POST" }),
        ] as const,
      },
    ];

    for (const [index, testCase] of successCases.entries()) {
      await expect(testCase.run()).resolves.toEqual(testCase.expected);
      expect(fetchMock).toHaveBeenNthCalledWith(index + 1, ...testCase.request);
    }
  });

  it("uses workspace sharing endpoints for member invites, members load, and team notify", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ status: "invited" }))
      .mockResolvedValueOnce(
        jsonResponse({
          members: [
            {
              email: "dev@avenire.local",
              name: "Dev User",
              role: "member",
              userId: "user-1",
            },
          ],
        })
      )
      .mockResolvedValueOnce(jsonResponse({ queued: true, recipients: 3 }));

    const workspaceCases = [
      {
        run: () =>
          shareWorkspaceMemberAccess({
            email: "dev@avenire.local",
            role: "member",
            workspaceUuid: "workspace-2",
          }),
        expected: { ok: true, status: "invited" },
        request: [
          "/api/workspaces/workspace-2/share/members",
          expect.objectContaining({ method: "POST" }),
        ] as const,
      },
      {
        run: () => loadWorkspaceShareMembers({ workspaceUuid: "workspace-2" }),
        expected: [
          {
            email: "dev@avenire.local",
            name: "Dev User",
            role: "member",
            userId: "user-1",
          },
        ],
        request: [
          "/api/workspaces/workspace-2/share/members",
          expect.objectContaining({ cache: "no-store" }),
        ] as const,
      },
      {
        run: () => notifyWorkspaceShareTeam({ workspaceUuid: "workspace-2" }),
        expected: {
          emailSentCount: 0,
          ok: true,
          queued: true,
          recipients: 3,
        },
        request: [
          "/api/workspaces/workspace-2/share/team",
          expect.objectContaining({ method: "POST" }),
        ] as const,
      },
    ];

    for (const [index, testCase] of workspaceCases.entries()) {
      await expect(testCase.run()).resolves.toEqual(testCase.expected);
      expect(fetchMock).toHaveBeenNthCalledWith(index + 1, ...testCase.request);
    }
  });

  it("returns null when the workspace members list cannot be loaded", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse(null, 500)
    );

    await expect(
      loadWorkspaceShareMembers({ workspaceUuid: "workspace-2" })
    ).resolves.toBeNull();
  });

  it("returns resource-specific workspace sharing failures", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(null, 500))
      .mockResolvedValueOnce(jsonResponse(null, 500));

    const failureCases = [
      {
        run: () =>
          shareWorkspaceMemberAccess({
            email: "dev@avenire.local",
            role: "admin",
            workspaceUuid: "workspace-2",
          }),
        expected: {
          error: "Unable to share workspace access.",
          ok: false,
        },
      },
      {
        run: () => notifyWorkspaceShareTeam({ workspaceUuid: "workspace-2" }),
        expected: {
          error: "Unable to notify workspace team.",
          ok: false,
        },
      },
    ];

    for (const testCase of failureCases) {
      await expect(testCase.run()).resolves.toEqual(testCase.expected);
    }
  });

  it("returns resource-specific file and folder share failures", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(null, 500))
      .mockResolvedValueOnce(jsonResponse({ shareUrl: null }))
      .mockResolvedValueOnce(jsonResponse(null, 500))
      .mockResolvedValueOnce(jsonResponse({ shareUrl: null }));

    const failureCases = [
      {
        run: () =>
          grantFileShareAccess({
            email: "dev@avenire.local",
            fileId: "file-1",
            permission: "viewer",
            workspaceUuid: "workspace-1",
          }),
        expected: {
          error: "Unable to grant file access.",
          ok: false,
        },
      },
      {
        run: () =>
          createFileShareLink({
            fileId: "file-1",
            workspaceUuid: "workspace-1",
          }),
        expected: {
          error: "Unable to generate file link.",
          ok: false,
        },
      },
      {
        run: () =>
          grantFolderShareAccess({
            email: "dev@avenire.local",
            folderId: "folder-1",
            permission: "editor",
            workspaceUuid: "workspace-1",
          }),
        expected: {
          error: "Unable to grant folder access.",
          ok: false,
        },
      },
      {
        run: () =>
          createFolderShareLink({
            folderId: "folder-1",
            workspaceUuid: "workspace-1",
          }),
        expected: {
          error: "Unable to generate folder link.",
          ok: false,
        },
      },
    ];

    for (const testCase of failureCases) {
      await expect(testCase.run()).resolves.toEqual(testCase.expected);
    }
  });
});
