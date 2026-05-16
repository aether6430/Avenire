import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getRouteSessionMock, loginPageClientMock, redirectMock } = vi.hoisted(
  () => ({
    getRouteSessionMock: vi.fn(),
    loginPageClientMock: vi.fn(
      ({
        callbackURL,
        initialEmail,
        initialError,
      }: {
        callbackURL?: string;
        initialEmail?: string;
        initialError?: string | null;
      }) =>
        createElement("div", {
          "data-callback-url": callbackURL ?? "",
          "data-initial-email": initialEmail ?? "",
          "data-initial-error": initialError ?? "",
        })
    ),
    redirectMock: vi.fn((href: string) => {
      throw new Error(`redirect:${href}`);
    }),
  })
);

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/components/auth/login-page-client", () => ({
  LoginPageClient: loginPageClientMock,
}));

vi.mock("@/lib/workspace-route-context", () => ({
  getRouteSession: getRouteSessionMock,
}));

import LoginPage, { dynamic, metadata } from "./page";

describe("login page contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps route metadata aligned and request-driven", () => {
    expect(metadata.title).toBe("Sign in — Avenire");
    expect(dynamic).toBe("force-dynamic");
  });

  it("redirects signed-in users to a safe callback route", async () => {
    getRouteSessionMock.mockResolvedValueOnce({
      user: { id: "user-1" },
    });

    await expect(
      LoginPage({
        searchParams: Promise.resolve({
          callbackURL: "/share/token-1",
        }),
      })
    ).rejects.toThrow("redirect:/share/token-1");

    expect(redirectMock).toHaveBeenCalledWith("/share/token-1");
  });

  it("falls back to /workspace instead of redirecting back into /login", async () => {
    getRouteSessionMock.mockResolvedValueOnce({
      user: { id: "user-1" },
    });

    await expect(
      LoginPage({
        searchParams: Promise.resolve({
          callbackURL: "/login",
        }),
      })
    ).rejects.toThrow("redirect:/workspace");

    expect(redirectMock).toHaveBeenCalledWith("/workspace");
  });

  it("renders the login client with server-parsed auth query state for signed-out users", async () => {
    getRouteSessionMock.mockResolvedValueOnce(null);

    const element = await LoginPage({
      searchParams: Promise.resolve({
        callbackURL: "/share/token-1",
        email: "dev@avenire.local",
        error_description: "Bad session",
      }),
    });
    const html = renderToStaticMarkup(element);

    expect(loginPageClientMock).toHaveBeenCalledTimes(1);
    expect(html).toContain('data-callback-url="/share/token-1"');
    expect(html).toContain('data-initial-email="dev@avenire.local"');
    expect(html).toContain('data-initial-error="Bad session"');
  });
});
