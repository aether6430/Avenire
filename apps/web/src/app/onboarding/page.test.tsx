import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getRouteSessionMock,
  getUserSettingsMock,
  onboardingPageClientMock,
  redirectMock,
} = vi.hoisted(() => ({
  getRouteSessionMock: vi.fn(),
  getUserSettingsMock: vi.fn(),
  onboardingPageClientMock: vi.fn(() =>
    createElement("div", { "data-onboarding-client": "1" })
  ),
  redirectMock: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/components/auth/onboarding-page-client", () => ({
  OnboardingPageClient: onboardingPageClientMock,
}));

vi.mock("@avenire/database", () => ({
  getUserSettings: getUserSettingsMock,
}));

vi.mock("@/lib/workspace-route-context", () => ({
  getRouteSession: getRouteSessionMock,
}));

import OnboardingPage, { dynamic, metadata } from "./page";

describe("onboarding page contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps route metadata and dynamic config aligned to the onboarding surface", () => {
    expect(metadata.title).toBe("Onboarding — Avenire");
    expect(dynamic).toBe("force-dynamic");
  });

  it("redirects anonymous visitors to login with an onboarding callback", async () => {
    getRouteSessionMock.mockResolvedValueOnce(null);

    await expect(OnboardingPage()).rejects.toThrow(
      "redirect:/login?callbackURL=/onboarding"
    );

    expect(redirectMock).toHaveBeenCalledWith("/login?callbackURL=/onboarding");
  });

  it("redirects completed users straight into the workspace", async () => {
    getRouteSessionMock.mockResolvedValueOnce({
      user: { id: "user-1" },
    });
    getUserSettingsMock.mockResolvedValueOnce({
      onboardingCompleted: true,
    });

    await expect(OnboardingPage()).rejects.toThrow("redirect:/workspace");

    expect(getUserSettingsMock).toHaveBeenCalledWith("user-1");
    expect(redirectMock).toHaveBeenCalledWith("/workspace");
  });

  it("renders the onboarding client when the signed-in user still needs setup", async () => {
    getRouteSessionMock.mockResolvedValueOnce({
      user: { id: "user-1" },
    });
    getUserSettingsMock.mockResolvedValueOnce({
      onboardingCompleted: false,
    });

    const element = await OnboardingPage();
    const html = renderToStaticMarkup(element);

    expect(getUserSettingsMock).toHaveBeenCalledWith("user-1");
    expect(onboardingPageClientMock).toHaveBeenCalledTimes(1);
    expect(html).toContain('data-onboarding-client="1"');
  });
});
