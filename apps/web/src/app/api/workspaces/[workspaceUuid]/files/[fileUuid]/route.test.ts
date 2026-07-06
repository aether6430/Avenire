import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserMock, handleWorkspaceFilePatchMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  handleWorkspaceFilePatchMock: vi.fn(),
}));

vi.mock("@/lib/workspace", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("./workspace-file-route-get", () => ({
  handleWorkspaceFileGet: vi.fn(),
}));

vi.mock("./workspace-file-route-mutations", () => ({
  handleWorkspaceFileDelete: vi.fn(),
  handleWorkspaceFilePatch: handleWorkspaceFilePatchMock,
}));

import { PATCH } from "./route";

const patchFile = (body: unknown) =>
  PATCH(
    new Request(
      "http://localhost:3003/api/workspaces/workspace-1/files/file-1",
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

describe("/api/workspaces/[workspaceUuid]/files/[fileUuid] route", () => {
  beforeEach(() => {
    getSessionUserMock.mockReset();
    handleWorkspaceFilePatchMock.mockReset();

    getSessionUserMock.mockResolvedValue({ id: "user-1" });
  });

  it("rejects malformed file metadata before mutating the file", async () => {
    const response = await patchFile({
      metadata: ["not", "an", "object"],
      name: "Lecture.md",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid request",
    });
    expect(handleWorkspaceFilePatchMock).not.toHaveBeenCalled();
  });
});
