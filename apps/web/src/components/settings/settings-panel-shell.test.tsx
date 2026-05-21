import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@avenire/ui/components/avatar", () => ({
  Avatar: ({ children }: { children: ReactNode }) =>
    createElement("div", { "data-avatar": "1" }, children),
  AvatarFallback: ({ children }: { children: ReactNode }) =>
    createElement("div", { "data-avatar-fallback": "1" }, children),
  AvatarImage: (props: Record<string, unknown>) =>
    createElement("img", props),
}));

vi.mock("@avenire/ui/components/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) =>
    createElement("div", { "data-badge": "1" }, children),
}));

vi.mock("@avenire/ui/components/button", () => ({
  Button: ({
    children,
    ...props
  }: React.ComponentProps<"button"> & { children?: ReactNode }) =>
    createElement("button", props, children),
}));

vi.mock("@/components/shared/sensitive-text", () => ({
  SensitiveText: ({ value }: { value?: string | null }) =>
    createElement("span", null, value ?? ""),
}));

import { SettingsPanelShell } from "@/components/settings/settings-panel-shell";

describe("SettingsPanelShell", () => {
  it("falls back to the resolved session user in the mobile header", () => {
    const html = renderToStaticMarkup(
      <SettingsPanelShell
        runtime={
          {
            currentPlanLabel: "Free Plan",
            currentTab: "account",
            displayAvatar: "",
            fallbackInitials: "UM",
            hasKeyboardDetected: false,
            mobileTabs: [],
            privacyMode: false,
            resolvedSessionUser: {
              email: "ux.qa+mobilefix@avenire.local",
              image: null,
              name: "UX QA Mobile Fix",
            },
            session: undefined,
            setTab: () => {},
          } as never
        }
      >
        <div>BODY</div>
      </SettingsPanelShell>
    );

    expect(html).toContain("UX QA Mobile Fix");
    expect(html).toContain("ux.qa+mobilefix@avenire.local");
    expect(html).not.toContain(">User<");
  });
});
