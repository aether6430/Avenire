import { describe, expect, it } from "vitest";
import { getConnectedAccountsStateMessage } from "./settings-account-model";

describe("settings account model", () => {
  it("keeps connected accounts loading, failure, and empty states distinct", () => {
    expect(
      getConnectedAccountsStateMessage({
        accountCount: 0,
        loadFailed: false,
        loading: true,
      })
    ).toBe("Loading linked accounts...");

    expect(
      getConnectedAccountsStateMessage({
        accountCount: 0,
        errorMessage: "accounts backend offline",
        loadFailed: true,
        loading: false,
      })
    ).toBe("accounts backend offline");

    expect(
      getConnectedAccountsStateMessage({
        accountCount: 0,
        loadFailed: false,
        loading: false,
      })
    ).toBe("No linked accounts yet.");

    expect(
      getConnectedAccountsStateMessage({
        accountCount: 1,
        loadFailed: false,
        loading: false,
      })
    ).toBeNull();
  });
});
