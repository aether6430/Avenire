import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getRouteSessionMock,
  redirectMock,
  registerFormMock,
  registerPageClientMock,
  useSearchParamsMock,
} = vi.hoisted(() => ({
  getRouteSessionMock: vi.fn(),
  redirectMock: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
  registerFormMock: vi.fn(({ callbackURL }: { callbackURL?: string }) =>
    createElement("div", {
      "data-form-callback-url": callbackURL ?? "",
    })
  ),
  registerPageClientMock: vi.fn(() =>
    createElement("div", {
      "data-register-client": "1",
    })
  ),
  useSearchParamsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  useSearchParams: useSearchParamsMock,
}));

vi.mock("@/components/auth/register-page-client", () => ({
  RegisterPageClient: registerPageClientMock,
}));

vi.mock("@avenire/auth/components/register", () => ({
  RegisterForm: registerFormMock,
}));

vi.mock("@/lib/workspace-route-context", () => ({
  getRouteSession: getRouteSessionMock,
}));

import RegisterPage, { dynamic, metadata } from "./page";

describe("register page contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("callbackURL=/share/token-1")
    );
  });

  it("keeps route metadata aligned and request-driven", () => {
    expect(metadata.title).toBe("Create account — Avenire");
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

    const element = await RegisterPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);

    expect(registerPageClientMock).toHaveBeenCalledTimes(1);
    expect(registerPageClientMock).toHaveBeenCalledWith({}, undefined);
    expect(html).toContain('data-register-client="1"');
  });

  it("fails closed to the signed-out client flow when route session lookup throws", async () => {
    getRouteSessionMock.mockRejectedValueOnce(
      new Error("register session offline")
    );

    const element = await RegisterPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(element);

    expect(redirectMock).not.toHaveBeenCalled();
    expect(registerPageClientMock).toHaveBeenCalledTimes(1);
    expect(html).toContain('data-register-client="1"');
  });

  it("lets the register client read the callback from search params directly", async () => {
    vi.resetModules();
    vi.doUnmock("@/components/auth/register-page-client");
    vi.doMock("next/navigation", () => ({
      useSearchParams: () => new URLSearchParams("callbackURL=/share/token-1"),
    }));
    vi.doMock("@avenire/auth/components/register", () => ({
      RegisterForm: registerFormMock,
    }));
    vi.doMock("@/components/auth-shell", () => ({
      AuthShell: ({ children }: { children: React.ReactNode }) =>
        createElement("div", { "data-auth-shell": "1" }, children),
    }));
    vi.doMock("@/components/auth/particle-form-frame", () => ({
      ParticleFormFrame: ({ children }: { children: React.ReactNode }) =>
        createElement("div", { "data-form-frame": "1" }, children),
    }));
    vi.doMock("next/link", () => ({
      default: ({
        children,
        href,
      }: {
        children: React.ReactNode;
        href: string;
      }) => createElement("a", { href }, children),
    }));

    const { RegisterPageClient: ActualRegisterPageClient } = await import(
      "@/components/auth/register-page-client"
    );
    const html = renderToStaticMarkup(createElement(ActualRegisterPageClient));

    expect(registerFormMock).toHaveBeenCalledWith(
      {
        callbackURL: "/share/token-1",
      },
      undefined
    );
    expect(html).toContain('data-form-callback-url="/share/token-1"');
  });
});
