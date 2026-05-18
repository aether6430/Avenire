import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { loadUserSettingsMock, saveUserSettingsMock } = vi.hoisted(() => ({
  loadUserSettingsMock: vi.fn(),
  saveUserSettingsMock: vi.fn(),
}));

vi.mock("@/lib/user-settings-client", () => ({
  loadUserSettings: loadUserSettingsMock,
  saveUserSettings: saveUserSettingsMock,
}));

import { useSettingsPanelRemotePreferences } from "@/components/settings/use-settings-panel-remote-preferences";

type HookValue = ReturnType<typeof useSettingsPanelRemotePreferences>;

function renderHookValue(
  options: Parameters<typeof useSettingsPanelRemotePreferences>[0]
): HookValue {
  let hookValue: HookValue | null = null;

  function Probe() {
    hookValue = useSettingsPanelRemotePreferences(options);
    return null;
  }

  renderToStaticMarkup(<Probe />);

  if (!hookValue) {
    throw new Error("Hook value was not captured.");
  }

  return hookValue;
}

describe("useSettingsPanelRemotePreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadUserSettingsMock.mockResolvedValue({
      completedTasksAtTop: false,
      emailReceipts: false,
      onboardingCompleted: true,
      petAccessory: "glasses",
      petName: "Auri",
    });
    saveUserSettingsMock.mockResolvedValue({
      completedTasksAtTop: false,
      emailReceipts: false,
      onboardingCompleted: true,
      petAccessory: "glasses",
      petName: "Auri",
    });
  });

  it("loads user settings through the dedicated transport", async () => {
    const hook = renderHookValue({
      currentTab: "preferences",
    });

    await hook.refreshUserSettings();

    expect(loadUserSettingsMock).toHaveBeenCalledTimes(1);
  });

  it("persists user settings and runs rollback on failure", async () => {
    const hook = renderHookValue({
      currentTab: "billing",
    });

    const rollback = vi.fn();
    await hook.persistUserSettings({ emailReceipts: false }, rollback);
    expect(saveUserSettingsMock).toHaveBeenCalledWith({
      emailReceipts: false,
    });
    expect(rollback).not.toHaveBeenCalled();

    saveUserSettingsMock.mockRejectedValueOnce(new Error("save failed"));
    await hook.persistUserSettings({ completedTasksAtTop: true }, rollback);
    expect(rollback).toHaveBeenCalledTimes(1);
  });
});
