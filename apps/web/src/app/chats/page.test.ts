import { describe, expect, it, vi } from "vitest";

const { getSessionMock, headersMock, redirectMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  headersMock: vi.fn(async () => new Headers()),
  redirectMock: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
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
  redirect: redirectMock,
}));

import ChatsPage from "./page";

describe("ChatsPage", () => {
  it("redirects signed-in users to the canonical workspace new-method route", async () => {
    getSessionMock.mockResolvedValueOnce({
      user: { id: "user-1" },
    });

    await expect(
      ChatsPage({
        searchParams: Promise.resolve({
          prompt: "focus on algebra",
        }),
      })
    ).rejects.toThrow("redirect:/workspace/chats/new?prompt=focus+on+algebra");

    expect(redirectMock).toHaveBeenCalledWith(
      "/workspace/chats/new?prompt=focus+on+algebra"
    );
  });

  it("still redirects anonymous users to login", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    await expect(
      ChatsPage({
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow("redirect:/login");

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });
});
