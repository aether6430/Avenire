"use client";

import { useMemo, useState } from "react";
import { KEYBOARD_SHORTCUT_GROUPS } from "@/components/settings/settings-panel-model";

export function useSettingsPanelShortcuts() {
  const [shortcutQuery, setShortcutQuery] = useState("");

  const filteredShortcutGroups = useMemo(() => {
    const query = shortcutQuery.trim().toLowerCase();
    if (!query) {
      return KEYBOARD_SHORTCUT_GROUPS;
    }

    return KEYBOARD_SHORTCUT_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((shortcut) =>
        [shortcut.label, shortcut.keys.join(" "), group.name]
          .join(" ")
          .toLowerCase()
          .includes(query)
      ),
    })).filter((group) => group.items.length > 0);
  }, [shortcutQuery]);

  const filteredShortcutCount = useMemo(
    () =>
      filteredShortcutGroups.reduce(
        (total, group) => total + group.items.length,
        0
      ),
    [filteredShortcutGroups]
  );

  return {
    filteredShortcutCount,
    filteredShortcutGroups,
    setShortcutQuery,
    shortcutQuery,
  };
}
