import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserMock, getUserSettingsMock, upsertUserSettingsMock } =
  vi.hoisted(() => ({
    getSessionUserMock: vi.fn(),
    getUserSettingsMock: vi.fn(),
    upsertUserSettingsMock: vi.fn(),
  }));

vi.mock("@/lib/user-settings", () => ({
  getUserSettings: getUserSettingsMock,
  upsertUserSettings: upsertUserSettingsMock,
}));

vi.mock("@/lib/workspace", () => ({
  getSessionUser: getSessionUserMock,
}));

import { GET, PUT } from "./route";

describe("/api/user-settings route", () => {
  beforeEach(() => {
    getSessionUserMock.mockReset();
    getUserSettingsMock.mockReset();
    upsertUserSettingsMock.mockReset();
  });

  it("returns unauthorized when there is no session user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const getResponse = await GET();
    expect(getResponse.status).toBe(401);
    await expect(getResponse.json()).resolves.toEqual({
      error: "Unauthorized",
    });

    const putResponse = await PUT(
      new Request("http://localhost:3003/api/user-settings", {
        body: JSON.stringify({ emailReceipts: true }),
        method: "PUT",
      })
    );
    expect(putResponse.status).toBe(401);
    await expect(putResponse.json()).resolves.toEqual({
      error: "Unauthorized",
    });
  });

  it("loads persisted settings for the signed-in user", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    getUserSettingsMock.mockResolvedValue({
      completedTasksAtTop: true,
      emailReceipts: false,
      onboardingCompleted: true,
      petAccessory: "flower",
      petName: "Auri",
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      settings: {
        completedTasksAtTop: true,
        emailReceipts: false,
        onboardingCompleted: true,
        petAccessory: "flower",
        petName: "Auri",
      },
    });
    expect(getUserSettingsMock).toHaveBeenCalledWith("user-1");
  });

  it("rejects invalid JSON bodies and empty updates", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });

    let response = await PUT(
      new Request("http://localhost:3003/api/user-settings", {
        body: "{",
        method: "PUT",
      })
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid JSON body",
    });

    response = await PUT(
      new Request("http://localhost:3003/api/user-settings", {
        body: JSON.stringify({ petName: "   " }),
        method: "PUT",
      })
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error:
        "Provide at least one setting: emailReceipts, completedTasksAtTop, onboardingCompleted, petName, petAccessory",
    });
  });

  it("rejects invalid pet accessories instead of persisting unknown values", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });

    const response = await PUT(
      new Request("http://localhost:3003/api/user-settings", {
        body: JSON.stringify({ petAccessory: "cape" }),
        method: "PUT",
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error:
        "Provide at least one setting: emailReceipts, completedTasksAtTop, onboardingCompleted, petName, petAccessory",
    });
    expect(upsertUserSettingsMock).not.toHaveBeenCalled();
  });

  it("persists normalized updates for valid settings payloads", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    upsertUserSettingsMock.mockResolvedValue({
      completedTasksAtTop: false,
      emailReceipts: true,
      onboardingCompleted: true,
      petAccessory: "flower",
      petName: "Auri Prime Extended Name That Wi",
    });

    const response = await PUT(
      new Request("http://localhost:3003/api/user-settings", {
        body: JSON.stringify({
          completedTasksAtTop: false,
          emailReceipts: true,
          onboardingCompleted: true,
          petAccessory: "  flower  ",
          petName: "  Auri Prime Extended Name That Will Be Trimmed  ",
        }),
        method: "PUT",
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      settings: {
        completedTasksAtTop: false,
        emailReceipts: true,
        onboardingCompleted: true,
        petAccessory: "flower",
        petName: "Auri Prime Extended Name That Wi",
      },
    });
    expect(upsertUserSettingsMock).toHaveBeenCalledWith("user-1", {
      completedTasksAtTop: false,
      emailReceipts: true,
      onboardingCompleted: true,
      petAccessory: "flower",
      petName: "Auri Prime Extended Name That Wi",
    });
  });
});
