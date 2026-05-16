import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getRouteSessionMock,
  getUserSettingsMock,
  redirectMock,
  waitlistPageClientMock,
} = vi.hoisted(() => ({
  getRouteSessionMock: vi.fn(),
  getUserSettingsMock: vi.fn(),
  redirectMock: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
  waitlistPageClientMock: vi.fn(() =>
    createElement("div", { "data-waitlist-client": "1" })
  ),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/components/auth/waitlist-page-client", () => ({
  WaitlistPageClient: waitlistPageClientMock,
}));

vi.mock("@/lib/user-settings", () => ({
  getUserSettings: getUserSettingsMock,
}));

vi.mock("@/lib/workspace-route-context", () => ({
  getRouteSession: getRouteSessionMock,
}));

import WaitlistPage, { dynamic, metadata } from "./page";

describe("waitlist page contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps route metadata aligned and request-driven", () => {
    expect(metadata.title).toBe("Join the waitlist — Avenire");
    expect(dynamic).toBe("force-dynamic");
  });

  it("redirects signed-in users who finished onboarding into the workspace", async () => {
    getRouteSessionMock.mockResolvedValueOnce({
      user: { id: "user-1" },
    });
    getUserSettingsMock.mockResolvedValueOnce({
      onboardingCompleted: true,
    });

    await expect(WaitlistPage()).rejects.toThrow("redirect:/workspace");

    expect(getUserSettingsMock).toHaveBeenCalledWith("user-1");
    expect(redirectMock).toHaveBeenCalledWith("/workspace");
  });

  it("redirects signed-in users without completed onboarding into onboarding", async () => {
    getRouteSessionMock.mockResolvedValueOnce({
      user: { id: "user-1" },
    });
    getUserSettingsMock.mockResolvedValueOnce({
      onboardingCompleted: false,
    });

    await expect(WaitlistPage()).rejects.toThrow("redirect:/onboarding");

    expect(getUserSettingsMock).toHaveBeenCalledWith("user-1");
    expect(redirectMock).toHaveBeenCalledWith("/onboarding");
  });

  it("renders the waitlist client for signed-out visitors", async () => {
    getRouteSessionMock.mockResolvedValueOnce(null);

    const element = await WaitlistPage();
    const html = renderToStaticMarkup(element);

    expect(waitlistPageClientMock).toHaveBeenCalledTimes(1);
    expect(html).toContain('data-waitlist-client="1"');
  });
});
