import { describe, expect, it } from "vitest";
import { getPasskeysStateMessage } from "./settings-security-model";

describe("settings security model", () => {
  it("keeps passkey loading, failure, and empty states distinct", () => {
    expect(
      getPasskeysStateMessage({
        loadFailed: false,
        loading: true,
        passkeyCount: 0,
      })
    ).toBe("Loading passkeys...");

    expect(
      getPasskeysStateMessage({
        loadFailed: true,
        loading: false,
        passkeyCount: 0,
      })
    ).toBe("Unable to load passkeys.");

    expect(
      getPasskeysStateMessage({
        loadFailed: false,
        loading: false,
        passkeyCount: 0,
      })
    ).toBe("No passkeys registered.");

    expect(
      getPasskeysStateMessage({
        loadFailed: false,
        loading: false,
        passkeyCount: 2,
      })
    ).toBeNull();
  });
});
