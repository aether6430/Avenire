import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

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
        invitationsLoadFailed
        user={{ email: "a@b.com", name: "Auri" }}
        workspaces={[]}
        workspacesLoadFailed
      />
    );

    expect(html).toContain("Unable to load workspaces.");
    expect(html).toContain("Unable to load invites.");
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
