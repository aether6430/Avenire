import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SettingsPanelShell } from "@/components/settings/settings-panel-shell";
import type { SettingsPanelRuntime } from "@/components/settings/use-settings-panel";

vi.mock("@avenire/ui/components/avatar", () => ({
  Avatar: ({ children }: { children: ReactNode }) =>
    createElement("span", null, children),
  AvatarFallback: ({ children }: { children: ReactNode }) =>
    createElement("span", null, children),
  AvatarImage: ({ alt, src }: { alt: string; src: string }) =>
    createElement("img", { alt, src }),
}));

vi.mock("@avenire/ui/components/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) =>
    createElement("span", null, children),
}));

vi.mock("@avenire/ui/components/button", () => ({
  Button: ({ children, ...props }: { children: ReactNode }) =>
    createElement("button", props, children),
}));

vi.mock("@/components/shared/sensitive-text", () => ({
  SensitiveText: ({ value }: { value: string | null | undefined }) =>
    createElement("span", null, value ?? ""),
}));

function createRuntime(
  overrides: Partial<SettingsPanelRuntime> = {}
): SettingsPanelRuntime {
  return {
    currentPlanLabel: "Core Plan",
    currentTab: "billing",
    displayAvatar: "https://cdn.avenire.app/avatar.png",
    fallbackInitials: "AU",
    hasKeyboardDetected: true,
    mobileTabs: [
      {
        icon: () => createElement("svg"),
        key: "account",
        label: "Account",
      },
      {
        icon: () => createElement("svg"),
        key: "billing",
        label: "Billing",
      },
    ],
    privacyMode: false,
    session: {
      user: {
        email: "owner@example.com",
        name: "Owner",
      },
    },
    setTab: () => {},
    ...overrides,
  } as unknown as SettingsPanelRuntime;
}

describe("SettingsPanelShell", () => {
  it("renders desktop and mobile settings navigation with current plan context", () => {
    const html = renderToStaticMarkup(
      <SettingsPanelShell runtime={createRuntime()}>
        <div>SETTINGS_BODY</div>
      </SettingsPanelShell>
    );

    expect(html).toContain("Settings");
    expect(html).toContain(">Account<");
    expect(html).toContain(">Preferences<");
    expect(html).toContain(">Workspace<");
    expect(html).toContain(">Data<");
    expect(html).toContain(">Billing<");
    expect(html).toContain(">Security<");
    expect(html).toContain("Keyboard Shortcuts");
    expect(html).toContain("Owner");
    expect(html).toContain("owner@example.com");
    expect(html).toContain("Core Plan");
    expect(html).toContain("SETTINGS_BODY");
  });

  it("hides the keyboard-shortcuts tab when no keyboard has been detected", () => {
    const html = renderToStaticMarkup(
      <SettingsPanelShell
        runtime={createRuntime({
          hasKeyboardDetected: false,
        })}
      >
        <div>SETTINGS_BODY</div>
      </SettingsPanelShell>
    );

    expect(html).not.toContain("Keyboard Shortcuts");
  });
});
