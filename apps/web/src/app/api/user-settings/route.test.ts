import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserMock, getUserSettingsMock, upsertUserSettingsMock } =
  vi.hoisted(() => ({
    getSessionUserMock: vi.fn(),
    getUserSettingsMock: vi.fn(),
    upsertUserSettingsMock: vi.fn(),
  }));

vi.mock("@avenire/database", () => ({
  getUserSettings: getUserSettingsMock,
  upsertUserSettings: upsertUserSettingsMock,
}));

vi.mock("@/lib/workspace", () => ({
  getSessionUser: getSessionUserMock,
}));

import { GET, PUT } from "./route";

const userSettingsRouteGetSource = readFileSync(
  resolve(import.meta.dirname, "./user-settings-route-get.ts"),
  "utf8"
);
const userSettingsRoutePutSource = readFileSync(
  resolve(import.meta.dirname, "./user-settings-route-put.ts"),
  "utf8"
);

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

  it("fails closed when session lookup throws before user settings handlers run", async () => {
    getSessionUserMock.mockRejectedValueOnce(
      new Error("settings auth offline")
    );

    let response = await GET();
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "settings auth offline",
    });
    expect(getUserSettingsMock).not.toHaveBeenCalled();

    getSessionUserMock.mockRejectedValueOnce(
      new Error("settings save auth offline")
    );
    response = await PUT(
      new Request("http://localhost:3003/api/user-settings", {
        body: JSON.stringify({ emailReceipts: true }),
        method: "PUT",
      })
    );
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "settings save auth offline",
    });
    expect(upsertUserSettingsMock).not.toHaveBeenCalled();
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

  it("fails closed with an explicit load error when user settings cannot be read", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    getUserSettingsMock.mockRejectedValue(new Error("settings offline"));

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "settings offline",
    });
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
      petName: "Auri Prime",
    });

    const response = await PUT(
      new Request("http://localhost:3003/api/user-settings", {
        body: JSON.stringify({
          completedTasksAtTop: false,
          emailReceipts: true,
          onboardingCompleted: true,
          petAccessory: "  Flower  ",
          petName: "  Auri   Prime  ",
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
        petName: "Auri Prime",
      },
    });
    expect(upsertUserSettingsMock).toHaveBeenCalledWith("user-1", {
      completedTasksAtTop: false,
      emailReceipts: true,
      onboardingCompleted: true,
      petAccessory: "flower",
      petName: "Auri Prime",
    });
  });

  it("fails closed with an explicit save error when persistence throws", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    upsertUserSettingsMock.mockRejectedValue(new Error("write failed"));

    const response = await PUT(
      new Request("http://localhost:3003/api/user-settings", {
        body: JSON.stringify({ emailReceipts: true }),
        method: "PUT",
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "write failed",
    });
  });

  it("reads and writes user settings directly through the database package", () => {
    expect(userSettingsRouteGetSource).toContain('from "@avenire/database"');
    expect(userSettingsRoutePutSource).toContain('from "@avenire/database"');
    expect(userSettingsRouteGetSource).not.toContain("@/lib/user-settings");
    expect(userSettingsRoutePutSource).not.toContain("@/lib/user-settings");
  });
});
