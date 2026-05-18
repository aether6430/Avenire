import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSettingsPanelNavigation } from "@/components/settings/use-settings-panel-navigation";

type HookValue = ReturnType<typeof useSettingsPanelNavigation>;

function renderHookValue(
  options: Parameters<typeof useSettingsPanelNavigation>[0]
): HookValue {
  let hookValue: HookValue | null = null;

  function Probe() {
    hookValue = useSettingsPanelNavigation(options);
    return null;
  }

  renderToStaticMarkup(<Probe />);

  if (!hookValue) {
    throw new Error("Hook value was not captured.");
  }

  return hookValue;
}

describe("useSettingsPanelNavigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes tab changes through the settings overlay route builder", () => {
    const replace = vi.fn();
    const hook = renderHookValue({
      hasKeyboardDetected: true,
      initialTab: "account",
      pathname: "/workspace",
      router: { replace } as never,
      searchParams: new URLSearchParams("overlay=settings") as never,
    });

    expect(hook.currentTab).toBe("account");
    expect(hook.visibleTabs.some((tab) => tab.key === "shortcuts")).toBe(true);
    expect(
      hook.mobileTabs.every(
        (tab) => !("mobileHidden" in tab && tab.mobileHidden)
      )
    ).toBe(true);

    hook.setTab("billing");
    expect(replace).toHaveBeenCalledWith(
      "/workspace?overlay=settings&settingsTab=billing"
    );
  });

  it("hides keyboard shortcuts when no keyboard was detected and avoids redundant replace calls", () => {
    const replace = vi.fn();
    const hook = renderHookValue({
      hasKeyboardDetected: false,
      initialTab: "account",
      pathname: "/workspace",
      router: { replace } as never,
      searchParams: new URLSearchParams("overlay=settings") as never,
    });

    expect(hook.visibleTabs.some((tab) => tab.key === "shortcuts")).toBe(false);

    hook.setTab("account");
    expect(replace).not.toHaveBeenCalled();
  });
});
