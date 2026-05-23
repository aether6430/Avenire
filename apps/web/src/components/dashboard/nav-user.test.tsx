import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { DitherIdenticonMock } = vi.hoisted(() => ({
  DitherIdenticonMock: vi.fn(
    ({
      className,
      color,
      seed,
    }: {
      className?: string;
      color?: string;
      seed: string;
    }) => (
      <div
        data-identicon-class={className ?? ""}
        data-identicon-color={color ?? ""}
        data-identicon-seed={seed}
      />
    )
  ),
}));

vi.mock("@avenire/auth/client", () => ({
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: () => {},
    replace: () => {},
  }),
}));

vi.mock("@avenire/ui/components/sidebar", () => ({
  SidebarMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarMenuButton: ({ children }: { children: ReactNode }) => (
    <button type="button">{children}</button>
  ),
  SidebarMenuItem: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  useSidebar: () => ({
    isMobile: false,
    setOpenMobile: () => {},
  }),
}));

vi.mock("@avenire/ui/components/avatar", () => ({
  Avatar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => <div data-avatar-fallback={className ?? ""}>{children}</div>,
  AvatarImage: () => null,
}));

vi.mock("@avenire/ui/components/dither-identicon", () => ({
  DitherIdenticon: DitherIdenticonMock,
}));

vi.mock("@avenire/ui/components/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuGroup: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    disabled,
  }: {
    children: ReactNode;
    disabled?: boolean;
  }) => <div data-disabled={String(Boolean(disabled))}>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuSub: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuSubContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuSubTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@avenire/ui/components/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/hooks/use-haptics", () => ({
  useHaptics: () => () => Promise.resolve(),
}));

vi.mock("@/hooks/use-privacy-mode", () => ({
  usePrivacyMode: () => false,
}));

import { NavUser } from "./nav-user";

describe("NavUser", () => {
  it("uses the shared identicon fallback without forcing a monochrome color prop", () => {
    DitherIdenticonMock.mockClear();

    const html = renderToStaticMarkup(
      <NavUser user={{ email: "a@b.com", name: "Auri" }} />
    );

    const identiconProps = DitherIdenticonMock.mock.calls[0]?.[0];

    expect(identiconProps).toMatchObject({
      className: "size-full",
      seed: "Auri",
    });
    expect(identiconProps).not.toHaveProperty("color");
    expect(html).toContain(
      'data-avatar-fallback="overflow-hidden rounded-lg bg-muted text-foreground"'
    );
  });

  it("renders explicit empty workspace and invitation copy when nothing is available yet", () => {
    const html = renderToStaticMarkup(
      <NavUser
        invitations={[]}
        user={{ email: "a@b.com", name: "Auri" }}
        workspaces={[]}
      />
    );

    expect(html).toContain("No workspaces yet.");
    expect(html).toContain("No pending invites");
    expect(html).not.toContain("Loading workspaces...");
    expect(html).not.toContain("Loading invites...");
  });

  it("renders explicit workspace and invitation loading states instead of silent empty menu copy", () => {
    const html = renderToStaticMarkup(
      <NavUser
        invitations={[]}
        invitationsLoading
        user={{ email: "a@b.com", name: "Auri" }}
        workspaces={[]}
        workspacesLoading
      />
    );

    expect(html).toContain("Loading workspaces...");
    expect(html).toContain("Loading invites...");
    expect(html).not.toContain("No pending invites");
  });

  it("renders explicit workspace and invitation failure states instead of silent empty menu copy", () => {
    const html = renderToStaticMarkup(
      <NavUser
        invitations={[]}
        invitationsErrorMessage="invites backend offline"
        invitationsLoadFailed
        user={{ email: "a@b.com", name: "Auri" }}
        workspaces={[]}
        workspacesErrorMessage="workspace backend offline"
        workspacesLoadFailed
      />
    );

    expect(html).toContain("workspace backend offline");
    expect(html).toContain("invites backend offline");
    expect(html).not.toContain("No pending invites");
  });

  it("renders sidebar workspace action errors when switching workspaces or handling invites fails", () => {
    const html = renderToStaticMarkup(
      <NavUser
        user={{ email: "a@b.com", name: "Auri" }}
        workspaceActionStatus="Unable to switch workspace."
      />
    );

    expect(html).toContain("Unable to switch workspace.");
  });
});
