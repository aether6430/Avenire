import { describe, expect, it } from "vitest";
import { getExplorerMobileConfirmCopy } from "@/components/files/explorer/explorer-mobile-actions-model";

describe("explorer mobile actions model", () => {
  it("returns the right destructive copy for delete and move confirmations", () => {
    expect(getExplorerMobileConfirmCopy("delete")).toEqual({
      confirmVariant: "destructive",
      description: "This will remove the selected items.",
      title: "Delete items",
    });

    expect(getExplorerMobileConfirmCopy("move")).toEqual({
      confirmVariant: "default",
      description: "This will move the selected items up one folder.",
      title: "Move items",
    });
  });

  it("returns null when there is no pending mobile confirmation", () => {
    expect(getExplorerMobileConfirmCopy(null)).toBeNull();
  });
});
