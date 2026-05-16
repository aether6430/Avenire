import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getRouteSessionMock, redirectMock, registerPageClientMock } =
  vi.hoisted(() => ({
    getRouteSessionMock: vi.fn(),
    redirectMock: vi.fn((href: string) => {
      throw new Error(`redirect:${href}`);
    }),
    registerPageClientMock: vi.fn(({ callbackURL }: { callbackURL?: string }) =>
      createElement("div", {
        "data-callback-url": callbackURL ?? "",
      })
    ),
  }));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/components/auth/register-page-client", () => ({
  RegisterPageClient: registerPageClientMock,
}));

vi.mock("@/lib/workspace-route-context", () => ({
  getRouteSession: getRouteSessionMock,
}));

import RegisterPage, { dynamic, metadata } from "./page";

describe("register page contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps route metadata aligned and request-driven", () => {
    expect(metadata.title).toBe("Create an account — Avenire");
    expect(dynamic).toBe("force-dynamic");
  });

  it("redirects signed-in users to a safe callback route", async () => {
    getRouteSessionMock.mockResolvedValueOnce({
      user: { id: "user-1" },
    });

    await expect(
      RegisterPage({
        searchParams: Promise.resolve({
          callbackURL: "/onboarding",
        }),
      })
    ).rejects.toThrow("redirect:/onboarding");

    expect(redirectMock).toHaveBeenCalledWith("/onboarding");
  });

  it("falls back to /onboarding instead of redirecting back into /register", async () => {
    getRouteSessionMock.mockResolvedValueOnce({
      user: { id: "user-1" },
    });

    await expect(
      RegisterPage({
        searchParams: Promise.resolve({
          callbackURL: "/register",
        }),
      })
    ).rejects.toThrow("redirect:/onboarding");

    expect(redirectMock).toHaveBeenCalledWith("/onboarding");
  });

  it("renders the register client with the server-parsed callback for signed-out users", async () => {
    getRouteSessionMock.mockResolvedValueOnce(null);

    const element = await RegisterPage({
      searchParams: Promise.resolve({
        callbackURL: "/share/token-1",
      }),
    });
    const html = renderToStaticMarkup(element);

    expect(registerPageClientMock).toHaveBeenCalledTimes(1);
    expect(html).toContain('data-callback-url="/share/token-1"');
  });
});
