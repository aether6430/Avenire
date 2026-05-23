import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { linkSocialMock, listAccountsMock, unlinkAccountMock } = vi.hoisted(
  () => ({
    linkSocialMock: vi.fn(),
    listAccountsMock: vi.fn(),
    unlinkAccountMock: vi.fn(),
  })
);

vi.mock("@avenire/auth/app-client", () => ({
  linkSocial: linkSocialMock,
  listAccounts: listAccountsMock,
  unlinkAccount: unlinkAccountMock,
}));

import { useSettingsPanelLinkedAccounts } from "@/components/settings/use-settings-panel-linked-accounts";

type HookValue = ReturnType<typeof useSettingsPanelLinkedAccounts>;

function renderHookValue(
  options: Parameters<typeof useSettingsPanelLinkedAccounts>[0]
): HookValue {
  let hookValue: HookValue | null = null;

  function Probe() {
    hookValue = useSettingsPanelLinkedAccounts(options);
    return null;
  }

  renderToStaticMarkup(<Probe />);

  if (!hookValue) {
    throw new Error("Hook value was not captured.");
  }

  return hookValue;
}

describe("useSettingsPanelLinkedAccounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listAccountsMock.mockResolvedValue({
      data: [
        { accountId: "github-user", id: "account-1", providerId: "github" },
      ],
    });
    linkSocialMock.mockResolvedValue(undefined);
    unlinkAccountMock.mockResolvedValue({});
  });

  it("refreshes linked accounts through the auth client transport", async () => {
    const hook = renderHookValue({
      currentTab: "account",
    });

    await hook.refreshAccounts();

    expect(listAccountsMock).toHaveBeenCalledTimes(1);
  });

  it("routes provider connect and unlink actions through the auth client", async () => {
    const hook = renderHookValue({
      currentTab: "account",
    });

    await hook.linkAccountProvider("google");
    expect(linkSocialMock).toHaveBeenCalledWith({ provider: "google" });

    await hook.unlinkProviderAccount({
      accountId: "github-user",
      id: "account-1",
      providerId: "github",
    } as never);
    expect(unlinkAccountMock).toHaveBeenCalledWith({
      accountId: "github-user",
      providerId: "github",
    });
    expect(listAccountsMock).toHaveBeenCalledTimes(1);
  });

  it("fails closed when a linked account is missing the identity needed for unlinking", async () => {
    const hook = renderHookValue({
      currentTab: "account",
    });

    await hook.unlinkProviderAccount({
      accountId: undefined,
      id: undefined,
      providerId: "github",
    } as never);

    expect(unlinkAccountMock).not.toHaveBeenCalled();
    expect(listAccountsMock).not.toHaveBeenCalled();
  });
});
