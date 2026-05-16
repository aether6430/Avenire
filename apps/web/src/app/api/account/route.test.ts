import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  cookiesMock,
  deleteAuthUserByIdMock,
  getSessionUserMock,
  validateSudoCookieMock,
} = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  deleteAuthUserByIdMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  validateSudoCookieMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/lib/account-data", () => ({
  deleteAuthUserById: deleteAuthUserByIdMock,
}));

vi.mock("@/lib/sudo", () => ({
  SUDO_COOKIE_NAME: "avenire_sudo",
  validateSudoCookie: validateSudoCookieMock,
}));

vi.mock("@/lib/workspace", () => ({
  getSessionUser: getSessionUserMock,
}));

import { DELETE } from "./route";

describe("/api/account route", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
    deleteAuthUserByIdMock.mockReset();
    getSessionUserMock.mockReset();
    validateSudoCookieMock.mockReset();

    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "sudo-cookie" }),
    });
    validateSudoCookieMock.mockReturnValue(true);
  });

  it("returns unauthorized when there is no signed-in user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await DELETE();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("requires a valid sudo cookie before account deletion", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    validateSudoCookieMock.mockReturnValue(false);

    const response = await DELETE();

    expect(validateSudoCookieMock).toHaveBeenCalledWith({
      userId: "user-1",
      cookieValue: "sudo-cookie",
    });
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Sudo verification required",
    });
  });

  it("returns account not found when the delete operation fails", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    deleteAuthUserByIdMock.mockResolvedValue(null);

    const response = await DELETE();

    expect(deleteAuthUserByIdMock).toHaveBeenCalledWith("user-1");
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Account not found",
    });
  });

  it("deletes the account and clears the sudo cookie", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    deleteAuthUserByIdMock.mockResolvedValue({ id: "user-1" });

    const response = await DELETE();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.cookies.get("avenire_sudo")).toMatchObject({
      name: "avenire_sudo",
      value: "",
    });
  });
});
