import { describe, expect, it } from "vitest";
import {
  resolveExplorerContextActionSelection,
  resolveExplorerMobileItemClickBehavior,
  shouldOpenExplorerItemOnDoubleClick,
} from "@/components/files/explorer/explorer-item-interactions-model";

describe("explorer item interactions model", () => {
  it("resolves mobile click behavior for suppressed, toggle, and open flows", () => {
    expect(
      resolveExplorerMobileItemClickBehavior({
        isSuppressed: true,
        selectedCount: 0,
      })
    ).toBe("ignore");

    expect(
      resolveExplorerMobileItemClickBehavior({
        isSuppressed: false,
        selectedCount: 2,
      })
    ).toBe("toggle");

    expect(
      resolveExplorerMobileItemClickBehavior({
        isSuppressed: false,
        selectedCount: 0,
        toggleOnly: true,
      })
    ).toBe("toggle");

    expect(
      resolveExplorerMobileItemClickBehavior({
        isSuppressed: false,
        selectedCount: 0,
      })
    ).toBe("open");
  });

  it("resolves context action selection from current selection state", () => {
    expect(
      resolveExplorerContextActionSelection({
        itemId: "file-2",
        selectedIds: ["file-1", "file-2"],
      })
    ).toEqual({
      ids: ["file-1", "file-2"],
      shouldResetSelection: false,
    });

    expect(
      resolveExplorerContextActionSelection({
        itemId: "file-3",
        selectedIds: ["file-1", "file-2"],
      })
    ).toEqual({
      ids: ["file-3"],
      shouldResetSelection: true,
    });
  });

  it("only opens on a real double-click that did not hit an action target", () => {
    expect(
      shouldOpenExplorerItemOnDoubleClick({
        clickDetail: 2,
        isActionTarget: false,
      })
    ).toBe(true);

    expect(
      shouldOpenExplorerItemOnDoubleClick({
        clickDetail: 1,
        isActionTarget: false,
      })
    ).toBe(false);

    expect(
      shouldOpenExplorerItemOnDoubleClick({
        clickDetail: 2,
        isActionTarget: true,
      })
    ).toBe(false);
  });
});
