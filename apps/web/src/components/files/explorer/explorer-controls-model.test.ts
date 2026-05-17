import { describe, expect, it } from "vitest";
import {
  EXPLORER_DEFAULT_VISIBLE_CARD_PROPERTIES,
  EXPLORER_MAX_VISIBLE_CARD_PROPERTIES,
  EXPLORER_SORT_BUILTIN_OPTIONS,
  getExplorerSortDirectionLabel,
  getExplorerSortFieldLabel,
} from "@/components/files/explorer/explorer-controls-model";

describe("explorer-controls-model", () => {
  it("exposes stable card field limits", () => {
    expect(EXPLORER_MAX_VISIBLE_CARD_PROPERTIES).toBe(4);
    expect(EXPLORER_DEFAULT_VISIBLE_CARD_PROPERTIES).toBe(3);
  });

  it("exposes the built-in sort options in display order", () => {
    expect(EXPLORER_SORT_BUILTIN_OPTIONS).toEqual([
      { key: "name", label: "Name" },
      { key: "createdAt", label: "Date created" },
      { key: "updatedAt", label: "Date updated" },
    ]);
  });

  it("formats sort field and direction labels for builtin and property sorts", () => {
    expect(
      getExplorerSortFieldLabel({
        direction: "asc",
        key: "name",
        kind: "builtin",
      })
    ).toBe("Name");
    expect(
      getExplorerSortFieldLabel({
        direction: "desc",
        key: "priority",
        kind: "property",
        type: "number",
      })
    ).toBe("priority");
    expect(getExplorerSortDirectionLabel("asc")).toBe("Asc");
    expect(getExplorerSortDirectionLabel("desc")).toBe("Desc");
  });
});
