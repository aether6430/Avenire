import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement, type ReactNode } from "react";
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
    }) =>
      createElement("div", {
        "data-identicon-class": className ?? "",
        "data-identicon-color": color ?? "",
        "data-identicon-seed": seed,
      })
  ),
}));

vi.mock("@avenire/ui/components/avatar", () => ({
  Avatar: ({ children }: { children: ReactNode }) =>
    createElement("div", { "data-avatar": "1" }, children),
  AvatarFallback: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) =>
    createElement("div", { "data-avatar-fallback": className ?? "" }, children),
  AvatarImage: (props: Record<string, unknown>) => createElement("img", props),
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

vi.mock("@avenire/ui/components/dither-identicon", () => ({
  DitherIdenticon: DitherIdenticonMock,
}));

import { SettingsPanelShell } from "@/components/settings/settings-panel-shell";

const settingsPanelSource = readFileSync(
  resolve(import.meta.dirname, "./settings-panel.tsx"),
  "utf8"
);
const settingsPanelContentSource = readFileSync(
  resolve(import.meta.dirname, "./settings-panel-content.tsx"),
  "utf8"
);
const settingsPanelDialogsSource = readFileSync(
  resolve(import.meta.dirname, "./settings-panel-dialogs.tsx"),
  "utf8"
);
const settingsPanelShellSource = readFileSync(
  resolve(import.meta.dirname, "./settings-panel-shell.tsx"),
  "utf8"
);
const settingsDialogSource = readFileSync(
  resolve(import.meta.dirname, "./settings-dialog.tsx"),
  "utf8"
);
const useSettingsPanelSource = readFileSync(
  resolve(import.meta.dirname, "./use-settings-panel.ts"),
  "utf8"
);
const dashboardOverlayHostSource = readFileSync(
  resolve(import.meta.dirname, "../dashboard/dashboard-overlay-host.tsx"),
  "utf8"
);

describe("SettingsPanelShell", () => {
  it("falls back to the resolved session user in the mobile header", () => {
    DitherIdenticonMock.mockClear();

    const html = renderToStaticMarkup(
      <SettingsPanelShell
        runtime={
          {
            avatarSeed: "UX QA Mobile Fix",
            currentPlanLabel: "Free Plan",
            currentTab: "account",
            displayAvatar: "",
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
    const identiconProps = DitherIdenticonMock.mock.calls[0]?.[0];

    expect(identiconProps).toMatchObject({
      className: "size-full",
      seed: "UX QA Mobile Fix",
    });
    expect(identiconProps).not.toHaveProperty("color");
    expect(html).toContain(
      'data-avatar-fallback="overflow-hidden bg-muted text-foreground"'
    );
  });

  it("keeps the settings panel as a thin shell without a dead deferred editor loader", () => {
    expect(settingsPanelSource).toContain("SettingsPanelContent");
    expect(settingsPanelSource).toContain("SettingsPanelDialogs");
    expect(settingsPanelSource).toContain("useSettingsPanel({");
    expect(settingsPanelSource).not.toContain("DialogContent");
    expect(settingsPanelSource).not.toContain("switch (runtime.currentTab)");
    expect(settingsPanelSource).not.toContain("DeferredAvenireEditor");
    expect(settingsPanelSource).not.toContain('import("@/components/editor")');
  });

  it("keeps tab orchestration in settings-panel-content and sudo verification ownership in settings-panel-dialogs", () => {
    expect(settingsPanelContentSource).toContain(
      'from "@/components/settings/settings-panel-shell"'
    );
    expect(settingsPanelContentSource).toContain(
      "function ReadySettingsWorkspaceSection"
    );
    expect(settingsPanelContentSource).toContain("useSettingsPanelShortcuts()");
    expect(settingsPanelContentSource).not.toContain(
      "function ReadySettingsShortcutsSection"
    );
    expect(settingsPanelContentSource).toContain(
      "function ReadySettingsSecuritySection"
    );
    expect(settingsPanelContentSource).toContain("switch (runtime.currentTab)");
    expect(settingsPanelContentSource).toContain('case "account"');
    expect(settingsPanelContentSource).toContain('case "billing"');
    expect(settingsPanelContentSource).toContain('case "security"');
    expect(settingsPanelContentSource).toContain('case "preferences"');
    expect(settingsPanelContentSource).toContain('case "workspace"');
    expect(settingsPanelContentSource).toContain('case "data"');
    expect(settingsPanelContentSource).toContain(
      'runtime.currentTab === "shortcuts"'
    );
    expect(settingsPanelContentSource).not.toContain('case "shortcuts"');
    expect(settingsPanelContentSource).toContain("revokeOtherSessions");
    expect(settingsPanelShellSource).not.toContain("SettingsAccountSection");
    expect(settingsPanelShellSource).not.toContain("SettingsBillingSection");
    expect(settingsPanelShellSource).not.toContain("Verify Sensitive Action");
    expect(settingsPanelShellSource).toContain("no-scrollbar flex shrink-0");
    expect(settingsPanelShellSource).toContain("overflow-x-auto");
    expect(settingsPanelShellSource).toContain(
      'scrollbarGutter: "stable both-edges"'
    );
    expect(settingsPanelDialogsSource).toContain("Verify Sensitive Action");
    expect(settingsPanelDialogsSource).toContain("Resend Code");
    expect(settingsPanelDialogsSource).toContain("Verify and Continue");
    expect(settingsPanelDialogsSource).toContain(
      "codeRequestedForSessionRef.current = false"
    );
    expect(settingsPanelDialogsSource).toContain(
      "pendingSudoActionRef.current = null"
    );
    expect(settingsPanelDialogsSource).not.toContain(
      "switch (runtime.currentTab)"
    );
  });

  it("threads bootstrap settings users from the overlay host through the dialog into the panel fallback chain", () => {
    expect(dashboardOverlayHostSource).toContain(
      'from "@/components/settings/settings-panel-model"'
    );
    expect(dashboardOverlayHostSource).toContain(
      "initialUser?: SettingsInitialUser | null"
    );
    expect(dashboardOverlayHostSource).toContain(
      "initialWorkspaces?: WorkspaceSummary[]"
    );
    expect(dashboardOverlayHostSource).toContain("initialUser={initialUser}");

    expect(settingsDialogSource).toContain(
      'from "@/components/settings/settings-panel-model"'
    );
    expect(settingsDialogSource).toContain("initialTab?: TabKey");
    expect(settingsDialogSource).toContain(
      "initialWorkspaces?: WorkspaceSummary[]"
    );
    expect(settingsDialogSource).toContain("initialUser={initialUser}");
    expect(settingsDialogSource).not.toContain('tabMode="local"');

    expect(useSettingsPanelSource).toContain(
      "const session = sessionData ?? createSettingsSessionFallback(initialUser);"
    );
    expect(useSettingsPanelSource).toContain(
      "const resolvedSessionUser = session?.user ?? bootstrapUser ?? null;"
    );
    expect(useSettingsPanelSource).toContain(
      "sessionUser: resolvedSessionUser"
    );
  });
});
