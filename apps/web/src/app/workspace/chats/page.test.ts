import { describe, expect, it, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import WorkspaceChatsPage from "./page";

describe("WorkspaceChatsPage", () => {
  it("redirects the legacy empty chats route to the canonical new-method route", async () => {
    await expect(
      WorkspaceChatsPage({
        searchParams: Promise.resolve({
          overlay: "settings",
          settingsTab: "data",
        }),
      })
    ).rejects.toThrow(
      "redirect:/workspace/chats/new?overlay=settings&settingsTab=data"
    );

    expect(redirectMock).toHaveBeenCalledWith(
      "/workspace/chats/new?overlay=settings&settingsTab=data"
    );
  });
});
