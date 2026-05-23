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

vi.mock("@/lib/user-settings", () => ({
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

  it("keeps the pet step in normal document flow instead of the old absolute card stack", async () => {
    vi.resetModules();
    vi.doUnmock("@/components/auth/onboarding-page-client");
    vi.doMock("react", async (importOriginal) => {
      const actual = await importOriginal<typeof import("react")>();
      let useStateCallCount = 0;

      return {
        ...actual,
        useState(initial: unknown) {
          useStateCallCount += 1;
          return actual.useState(useStateCallCount === 1 ? 1 : initial);
        },
      };
    });
    vi.doMock("next/navigation", () => ({
      useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
    }));
    vi.doMock("next/dynamic", () => ({
      default: () => () => null,
    }));

    const { createElement: createReactElement } = await import("react");
    const { OnboardingPageClient } = await import(
      "@/components/auth/onboarding-page-client"
    );

    const html = renderToStaticMarkup(
      createReactElement(OnboardingPageClient, { countryCode: "US" })
    );

    expect(html).toContain("Set up your pet.");
    expect(html).toContain("mt-8 max-w-md");
    expect(html).not.toContain("relative mt-8 min-h-[22rem]");
  });

  it("resolves a client redirect to the workspace when onboarding is already complete", async () => {
    vi.resetModules();
    vi.doUnmock("@/components/auth/onboarding-page-client");

    const { resolveOnboardingClientRedirect } = await import(
      "@/components/auth/onboarding-page-client"
    );

    expect(
      resolveOnboardingClientRedirect({
        error: null,
        settings: { onboardingCompleted: true },
      })
    ).toBe("/workspace");
  });

  it("fails closed back to login when the client cannot load onboarding settings", async () => {
    vi.resetModules();
    vi.doUnmock("@/components/auth/onboarding-page-client");

    const { resolveOnboardingClientRedirect } = await import(
      "@/components/auth/onboarding-page-client"
    );

    expect(
      resolveOnboardingClientRedirect({
        error: new Error("offline"),
        settings: null,
      })
    ).toBe("/login?callbackURL=/onboarding");
  });
});
