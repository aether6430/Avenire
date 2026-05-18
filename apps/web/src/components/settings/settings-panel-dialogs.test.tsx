import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SettingsPanelDialogs } from "@/components/settings/settings-panel-dialogs";
import type { SettingsPanelRuntime } from "@/components/settings/use-settings-panel";

vi.mock("@avenire/ui/components/button", () => ({
  Button: ({ children, ...props }: { children: ReactNode }) =>
    createElement("button", props, children),
}));

vi.mock("@avenire/ui/components/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
  DialogContent: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
  DialogDescription: ({ children }: { children: ReactNode }) =>
    createElement("p", null, children),
  DialogFooter: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
  DialogHeader: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
  DialogTitle: ({ children }: { children: ReactNode }) =>
    createElement("h2", null, children),
}));

vi.mock("@avenire/ui/components/input", () => ({
  Input: (props: Record<string, unknown>) => createElement("input", props),
}));

vi.mock("@/components/shared/sensitive-text", () => ({
  SensitiveText: ({ value }: { value: string | null | undefined }) =>
    createElement("span", null, value ?? ""),
}));

function createRuntime(
  overrides: Partial<SettingsPanelRuntime> = {}
): SettingsPanelRuntime {
  return {
    codeRequestedForSessionRef: { current: false },
    pendingSudoActionRef: { current: null },
    privacyMode: false,
    requestSudoCode: async () => {},
    session: {
      user: {
        email: "owner@example.com",
      },
    },
    setSudoCode: () => {},
    setSudoDialogOpen: () => {},
    sudoActionLabel: "delete your workspace",
    sudoCode: "",
    sudoDialogOpen: true,
    sudoRequestingCode: false,
    sudoStatus: null,
    sudoVerifyingCode: false,
    verifySudoCodeAndContinue: async () => {},
    ...overrides,
  } as unknown as SettingsPanelRuntime;
}

describe("SettingsPanelDialogs", () => {
  it("renders the sudo verification dialog with the account email and disabled verify state", () => {
    const html = renderToStaticMarkup(
      <SettingsPanelDialogs runtime={createRuntime()} />
    );

    expect(html).toContain("Verify Sensitive Action");
    expect(html).toContain("owner@example.com");
    expect(html).toContain("delete your workspace");
    expect(html).toContain('placeholder="123456"');
    expect(html).toContain(">Resend Code<");
    expect(html).toContain("Verify and Continue");
    expect(html).toContain("disabled");
  });

  it("renders sending/verifying/status states for active sudo verification flows", () => {
    const html = renderToStaticMarkup(
      <SettingsPanelDialogs
        runtime={createRuntime({
          sudoActionLabel: "delete your account",
          sudoCode: "123456",
          sudoRequestingCode: true,
          sudoStatus: "Verification required.",
          sudoVerifyingCode: true,
        })}
      />
    );

    expect(html).toContain("delete your account");
    expect(html).toContain('value="123456"');
    expect(html).toContain("Verification required.");
    expect(html).toContain(">Sending...<");
    expect(html).toContain(">Verifying...<");
  });
});
