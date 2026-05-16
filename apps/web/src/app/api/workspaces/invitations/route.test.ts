import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserMock, listPendingInvitationsForEmailMock } = vi.hoisted(
  () => ({
    getSessionUserMock: vi.fn(),
    listPendingInvitationsForEmailMock: vi.fn(),
  })
);

vi.mock("@/lib/file-data", () => ({
  listPendingInvitationsForEmail: listPendingInvitationsForEmailMock,
}));

vi.mock("@/lib/workspace", () => ({
  getSessionUser: getSessionUserMock,
}));

import { GET } from "./route";

describe("/api/workspaces/invitations route", () => {
  beforeEach(() => {
    getSessionUserMock.mockReset();
    listPendingInvitationsForEmailMock.mockReset();
  });

  it("returns unauthorized without a session user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns pending invitations for the session email", async () => {
    getSessionUserMock.mockResolvedValue({
      email: "person@example.com",
      id: "user-1",
    });
    listPendingInvitationsForEmailMock.mockResolvedValue([{ id: "invite-1" }]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      invitations: [{ id: "invite-1" }],
    });
    expect(listPendingInvitationsForEmailMock).toHaveBeenCalledWith(
      "person@example.com"
    );
  });

  it("maps invitation loading failures to stable json", async () => {
    getSessionUserMock.mockResolvedValue({
      email: "person@example.com",
      id: "user-1",
    });
    listPendingInvitationsForEmailMock.mockRejectedValue(
      new Error("database offline")
    );

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "database offline",
    });
  });
});
