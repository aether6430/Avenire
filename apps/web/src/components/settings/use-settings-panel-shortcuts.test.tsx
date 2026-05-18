import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { KEYBOARD_SHORTCUT_GROUPS } from "@/components/settings/settings-panel-model";
import { useSettingsPanelShortcuts } from "@/components/settings/use-settings-panel-shortcuts";

type HookValue = ReturnType<typeof useSettingsPanelShortcuts>;

function renderHookValue(): HookValue {
  let hookValue: HookValue | null = null;

  function Probe() {
    hookValue = useSettingsPanelShortcuts();
    return null;
  }

  renderToStaticMarkup(<Probe />);

  if (!hookValue) {
    throw new Error("Hook value was not captured.");
  }

  return hookValue;
}

describe("useSettingsPanelShortcuts", () => {
  it("boots with the full shortcut catalog and an empty query", () => {
    const hook = renderHookValue();

    expect(hook.shortcutQuery).toBe("");
    expect(hook.filteredShortcutGroups).toEqual(KEYBOARD_SHORTCUT_GROUPS);
    expect(hook.filteredShortcutCount).toBe(
      KEYBOARD_SHORTCUT_GROUPS.reduce(
        (total, group) => total + group.items.length,
        0
      )
    );
  });
});
