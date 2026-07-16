import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureWorkspaceAccessForUserMock,
  getSessionUserMock,
  handleWorkspaceFileContentPatchMock,
} = vi.hoisted(() => ({
  ensureWorkspaceAccessForUserMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  handleWorkspaceFileContentPatchMock: vi.fn(),
}));

vi.mock("@/lib/workspace", () => ({
  ensureWorkspaceAccessForUser: ensureWorkspaceAccessForUserMock,
  getSessionUser: getSessionUserMock,
}));

vi.mock("./workspace-file-content-route-patch", () => ({
  handleWorkspaceFileContentPatch: handleWorkspaceFileContentPatchMock,
}));

import { PATCH } from "./route";

const patchFileContent = (body: unknown) =>
  PATCH(
    new Request(
      "http://localhost:3003/api/workspaces/workspace-1/files/file-1/content",
      {
        body: JSON.stringify(body),
        method: "PATCH",
      }
    ),
    {
      params: Promise.resolve({
        fileUuid: "file-1",
        workspaceUuid: "workspace-1",
      }),
    }
  );

const patchFileContentRaw = (body: string) =>
  PATCH(
    new Request(
      "http://localhost:3003/api/workspaces/workspace-1/files/file-1/content",
      {
        body,
        method: "PATCH",
      }
    ),
    {
      params: Promise.resolve({
        fileUuid: "file-1",
        workspaceUuid: "workspace-1",
      }),
    }
  );

describe("/api/workspaces/[workspaceUuid]/files/[fileUuid]/content route", () => {
  beforeEach(() => {
    ensureWorkspaceAccessForUserMock.mockReset();
    getSessionUserMock.mockReset();
    handleWorkspaceFileContentPatchMock.mockReset();

    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
  });

  it("rejects users without workspace access before parsing content", async () => {
    ensureWorkspaceAccessForUserMock.mockResolvedValue(false);

    const response = await patchFileContent({ content: "replacement" });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    expect(handleWorkspaceFileContentPatchMock).not.toHaveBeenCalled();
  });

  it("rejects malformed content replacement metadata before mutating content", async () => {
    const response = await patchFileContent({
      page: { properties: "not-an-object" },
      storageKey: "uploads/file-1",
      storageUrl: "https://utfs.io/f/file-1",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid request",
    });
    expect(handleWorkspaceFileContentPatchMock).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON before mutating content", async () => {
    const response = await patchFileContentRaw("{");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid request",
    });
    expect(handleWorkspaceFileContentPatchMock).not.toHaveBeenCalled();
  });
});
