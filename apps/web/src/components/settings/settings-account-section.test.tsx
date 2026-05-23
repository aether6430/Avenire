import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SettingsAccountSection } from "@/components/settings/settings-account-section";
import type { SettingsPanelRuntime } from "@/components/settings/use-settings-panel";

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

vi.mock("@avenire/ui/components/dither-identicon", () => ({
  DitherIdenticon: DitherIdenticonMock,
}));

function createRuntime(
  overrides: Partial<SettingsPanelRuntime> = {}
): SettingsPanelRuntime {
  return {
    accounts: [],
    accountsErrorMessage: null,
    accountsLoadFailed: false,
    accountsLoading: false,
    accountsStatus: null,
    avatarSeed: "Auri",
    avatarPreview: "",
    avatarUploading: false,
    displayAvatar: "",
    fileInputRef: { current: null },
    handleAvatarFileChange: async () => {},
    isSavingProfile: false,
    isUploadingAvatar: false,
    linkAccountProvider: async () => {},
    privacyMode: false,
    profileName: "Auri",
    profileStatus: null,
    saveProfile: async () => true,
    setProfileName: () => {},
    unlinkProviderAccount: async () => {},
    ...overrides,
  } as unknown as SettingsPanelRuntime;
}

describe("SettingsAccountSection", () => {
  it("renders an explicit loading state while linked accounts are still resolving", () => {
    const html = renderToStaticMarkup(
      <SettingsAccountSection
        runtime={createRuntime({ accountsLoading: true })}
      />
    );

    expect(html).toContain("Loading linked accounts...");
    expect(html).not.toContain("No linked accounts yet.");
  });

  it("renders an explicit failure state when linked accounts cannot be loaded", () => {
    const html = renderToStaticMarkup(
      <SettingsAccountSection
        runtime={createRuntime({
          accountsErrorMessage: "accounts backend offline",
          accountsLoadFailed: true,
        })}
      />
    );

    expect(html).toContain("accounts backend offline");
    expect(html).not.toContain("No linked accounts yet.");
  });

  it("renders profile controls and connected provider actions for loaded accounts", () => {
    DitherIdenticonMock.mockClear();

    const html = renderToStaticMarkup(
      <SettingsAccountSection
        runtime={createRuntime({
          accounts: [
            {
              accountId: "github-user",
              id: "account-1",
              providerId: "github",
            },
          ],
          accountsStatus: "GitHub linked.",
          avatarUploading: true,
          displayAvatar: "https://cdn.avenire.app/avatar.png",
          profileStatus: "Profile saved.",
        })}
      />
    );

    expect(html).toContain("Profile");
    expect(html).toContain("Display Name");
    expect(html).toContain("Profile photo");
    expect(html).toContain("Uploading...");
    expect(html).toContain("Save Changes");
    expect(html).toContain("Profile saved.");
    expect(html).toContain("Connected Providers");
    expect(html).toContain("Connect Google");
    expect(html).toContain("Connect GitHub");
    expect(html).toContain("github");
    expect(html).toContain("github-user");
    expect(html).toContain("GitHub linked.");
    const identiconProps = DitherIdenticonMock.mock.calls[0]?.[0];

    expect(identiconProps).toMatchObject({
      className: "size-full",
      seed: "Auri",
    });
    expect(identiconProps).not.toHaveProperty("color");
    expect(html).toContain(
      'data-avatar-fallback="overflow-hidden bg-muted text-foreground"'
    );
  });

  it("keeps the explicit empty state when no linked accounts exist", () => {
    const html = renderToStaticMarkup(
      <SettingsAccountSection runtime={createRuntime()} />
    );

    expect(html).toContain("No linked accounts yet.");
  });
});
