import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createWorkspaceByName,
  deleteWorkspaceById,
  inviteWorkspaceMemberByEmail,
  loadWorkspaceMembers,
  loadWorkspacesList,
  loadWorkspaceUsage,
  removeWorkspaceMemberById,
  updateWorkspaceLogo,
} from "@/components/settings/settings-workspace-client";

const workspaceRecord = {
  workspaceId: "workspace-1",
  name: "Alpha",
  logo: null,
  role: "owner",
};

const memberRecord = {
  id: "member-1",
  email: "owner@example.com",
  name: "Owner",
  role: "owner",
  userId: "user-1",
};

const usageRecord = {
  fileCount: 12,
  folderCount: 4,
  indexedFileCount: 10,
  memberCount: 3,
  pendingIngestionCount: 1,
  totalSizeBytes: 2048,
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status });
}

describe("settings workspace client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads workspace lists, members, and usage through dedicated transport routes", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ workspaces: [workspaceRecord] }))
      .mockResolvedValueOnce(jsonResponse({ members: [memberRecord] }))
      .mockResolvedValueOnce(jsonResponse({ usage: usageRecord }));

    const loadCases = [
      {
        run: () => loadWorkspacesList(),
        expected: [workspaceRecord],
        request: ["/api/workspaces/list", { cache: "no-store" }] as const,
      },
      {
        run: () => loadWorkspaceMembers("workspace-1"),
        expected: [memberRecord],
        request: [
          "/api/workspaces/workspace-1/share/members",
          { cache: "no-store" },
        ] as const,
      },
      {
        run: () => loadWorkspaceUsage("workspace-1"),
        expected: usageRecord,
        request: [
          "/api/workspaces/workspace-1/usage",
          { cache: "no-store" },
        ] as const,
      },
    ];

    for (const [index, testCase] of loadCases.entries()) {
      await expect(testCase.run()).resolves.toEqual(testCase.expected);
      expect(fetchMock).toHaveBeenNthCalledWith(index + 1, ...testCase.request);
    }
  });

  it("routes workspace mutations through the dedicated endpoints", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(
        jsonResponse({
          workspaces: [
            {
              workspaceId: "workspace-2",
              name: "Beta",
              logo: null,
              role: "owner",
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({ error: "Verification required." }, 403)
      );

    const mutationCases = [
      {
        run: () =>
          updateWorkspaceLogo({
            logo: "https://cdn.example.com/logo.png",
            workspaceId: "workspace-1",
          }),
        expected: undefined,
        request: [
          "/api/workspaces/workspace-1",
          expect.objectContaining({
            body: JSON.stringify({ logo: "https://cdn.example.com/logo.png" }),
            method: "PATCH",
          }),
        ] as const,
      },
      {
        run: () => createWorkspaceByName("New Workspace"),
        expected: undefined,
        request: [
          "/api/workspaces",
          expect.objectContaining({
            body: JSON.stringify({ name: "New Workspace" }),
            method: "POST",
          }),
        ] as const,
      },
      {
        run: () =>
          inviteWorkspaceMemberByEmail({
            email: "member@example.com",
            workspaceId: "workspace-1",
          }),
        expected: undefined,
        request: [
          "/api/workspaces/workspace-1/share/members",
          expect.objectContaining({
            body: JSON.stringify({ email: "member@example.com" }),
            method: "POST",
          }),
        ] as const,
      },
      {
        run: () =>
          removeWorkspaceMemberById({
            memberIdOrEmail: "member-1",
            workspaceId: "workspace-1",
          }),
        expected: undefined,
        request: [
          "/api/workspaces/workspace-1/share/members",
          expect.objectContaining({
            body: JSON.stringify({ memberIdOrEmail: "member-1" }),
            method: "DELETE",
          }),
        ] as const,
      },
      {
        run: () => deleteWorkspaceById("workspace-1"),
        expected: {
          status: "deleted",
          workspaces: [
            {
              workspaceId: "workspace-2",
              name: "Beta",
              logo: null,
              role: "owner",
            },
          ],
        },
        request: ["/api/workspaces/workspace-1", { method: "DELETE" }] as const,
      },
      {
        run: () => deleteWorkspaceById("workspace-1"),
        expected: {
          error: "Verification required.",
          status: "sudo_required",
        },
        request: ["/api/workspaces/workspace-1", { method: "DELETE" }] as const,
      },
    ];

    for (const [index, testCase] of mutationCases.entries()) {
      await expect(testCase.run()).resolves.toEqual(testCase.expected);
      expect(fetchMock).toHaveBeenNthCalledWith(index + 1, ...testCase.request);
    }
  });
});
