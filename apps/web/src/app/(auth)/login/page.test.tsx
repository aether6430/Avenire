import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getRouteSessionMock,
  loginFormMock,
  loginPageClientMock,
  redirectMock,
  useSearchParamsMock,
} = vi.hoisted(() => ({
  getRouteSessionMock: vi.fn(),
  loginFormMock: vi.fn(
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
        "data-form-callback-url": callbackURL ?? "",
        "data-form-initial-email": initialEmail ?? "",
        "data-form-initial-error": initialError ?? "",
      })
  ),
  loginPageClientMock: vi.fn(() =>
    createElement("div", { "data-login-client": "1" })
  ),
  redirectMock: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
  useSearchParamsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  useSearchParams: useSearchParamsMock,
}));

vi.mock("@/components/auth/login-page-client", () => ({
  LoginPageClient: loginPageClientMock,
}));

vi.mock("@avenire/auth/components/login", () => ({
  LoginForm: loginFormMock,
}));

vi.mock("@/lib/workspace-route-context", () => ({
  getRouteSession: getRouteSessionMock,
}));

import LoginPage, { dynamic, metadata } from "./page";

describe("login page contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams(
        "callbackURL=/share/token-1&email=dev@avenire.local&error_description=Bad%20session"
      )
    );
  });

  it("keeps route metadata aligned and request-driven", () => {
    expect(metadata.title).toBe("Log in — Avenire");
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

    const element = await LoginPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);

    expect(loginPageClientMock).toHaveBeenCalledTimes(1);
    expect(loginPageClientMock).toHaveBeenCalledWith({}, undefined);
    expect(html).toContain('data-login-client="1"');
  });

  it("fails closed to the signed-out client flow when route session lookup throws", async () => {
    getRouteSessionMock.mockRejectedValueOnce(
      new Error("login session offline")
    );

    const element = await LoginPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);

    expect(redirectMock).not.toHaveBeenCalled();
    expect(loginPageClientMock).toHaveBeenCalledTimes(1);
    expect(html).toContain('data-login-client="1"');
  });

  it("lets the login client read auth query state from search params directly", async () => {
    vi.resetModules();
    vi.doUnmock("@/components/auth/login-page-client");
    vi.doMock("next/navigation", () => ({
      useSearchParams: () =>
        new URLSearchParams(
          "callbackURL=/share/token-1&email=dev@avenire.local&error_description=Bad%20session"
        ),
    }));
    vi.doMock("@avenire/auth/components/login", () => ({
      LoginForm: loginFormMock,
    }));
    vi.doMock("@/components/auth-shell", () => ({
      AuthShell: ({ children }: { children: React.ReactNode }) =>
        createElement("div", { "data-auth-shell": "1" }, children),
    }));
    vi.doMock("@/components/auth/particle-form-frame", () => ({
      ParticleFormFrame: ({ children }: { children: React.ReactNode }) =>
        createElement("div", { "data-form-frame": "1" }, children),
    }));

    const { LoginPageClient: ActualLoginPageClient } = await import(
      "@/components/auth/login-page-client"
    );
    const html = renderToStaticMarkup(createElement(ActualLoginPageClient));

    expect(loginFormMock).toHaveBeenCalledWith(
      {
        callbackURL: "/share/token-1",
        initialEmail: "dev@avenire.local",
        initialError: "Bad session",
      },
      undefined
    );
    expect(html).toContain('data-form-callback-url="/share/token-1"');
    expect(html).toContain('data-form-initial-email="dev@avenire.local"');
    expect(html).toContain('data-form-initial-error="Bad session"');
  });
});
