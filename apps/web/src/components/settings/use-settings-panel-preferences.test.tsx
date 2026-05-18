import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useLocalStorageMock, useSettingsPanelRemotePreferencesMock } =
  vi.hoisted(() => ({
    useLocalStorageMock: vi.fn(),
    useSettingsPanelRemotePreferencesMock: vi.fn(),
  }));

vi.mock("usehooks-ts", () => ({
  useLocalStorage: useLocalStorageMock,
}));

vi.mock("@/components/settings/use-settings-panel-remote-preferences", () => ({
  useSettingsPanelRemotePreferences: useSettingsPanelRemotePreferencesMock,
}));

import { useSettingsPanelPreferences } from "@/components/settings/use-settings-panel-preferences";

type HookValue = ReturnType<typeof useSettingsPanelPreferences>;

function renderHookValue(
  options: Parameters<typeof useSettingsPanelPreferences>[0]
): HookValue {
  let hookValue: HookValue | null = null;

  function Probe() {
    hookValue = useSettingsPanelPreferences(options);
    return null;
  }

  renderToStaticMarkup(<Probe />);

  if (!hookValue) {
    throw new Error("Hook value was not captured.");
  }

  return hookValue;
}

describe("useSettingsPanelPreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLocalStorageMock.mockReturnValue(["enter", vi.fn()]);
    useSettingsPanelRemotePreferencesMock.mockReturnValue({
      completedTasksAtTop: false,
      emailReceipts: false,
      persistUserSettings: async () => {},
      petAccessory: "glasses",
      petName: "Auri",
      preferencesLoadFailed: false,
      preferencesLoading: false,
      preferencesStatus: "Preferences saved.",
      refreshUserSettings: async () => {},
      setCompletedTasksAtTop: () => {},
      setEmailReceipts: () => {},
      setPetAccessory: () => {},
      setPetName: () => {},
    });
  });

  it("composes local chat-send mode with remote preferences runtime", () => {
    const hook = renderHookValue({
      currentTab: "preferences",
    });

    expect(useLocalStorageMock).toHaveBeenCalledWith(
      "chat-composer-send-mode",
      "enter"
    );
    expect(useSettingsPanelRemotePreferencesMock).toHaveBeenCalledWith({
      currentTab: "preferences",
    });

    expect(hook).toMatchObject({
      chatComposerSendMode: "enter",
      completedTasksAtTop: false,
      emailReceipts: false,
      petAccessory: "glasses",
      petName: "Auri",
      preferencesLoadFailed: false,
      preferencesLoading: false,
      preferencesStatus: "Preferences saved.",
    });
  });
});
