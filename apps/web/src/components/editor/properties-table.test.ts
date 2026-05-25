import { describe, expect, it } from "vitest";
import { shouldAutoCommitDraftProperty } from "@/components/editor/properties-table-model";

describe("PropertiesTable draft property model", () => {
  it("auto-commits a new property only after editable key and value are present", () => {
    expect(
      shouldAutoCommitDraftProperty({
        disabled: false,
        isAddingProperty: true,
        key: " Topic ",
        value: " ux ",
      })
    ).toBe(true);

    expect(
      shouldAutoCommitDraftProperty({
        disabled: false,
        isAddingProperty: true,
        key: "topic",
        value: " ",
      })
    ).toBe(false);

    expect(
      shouldAutoCommitDraftProperty({
        disabled: true,
        isAddingProperty: true,
        key: "topic",
        value: "ux",
      })
    ).toBe(false);
  });
});
