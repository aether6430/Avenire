import { describe, expect, it } from "vitest";
import {
  createPasskeysRefreshFailureState,
  createPasskeysRefreshSuccessState,
  normalizePasskeysPayload,
  resolveAccountDeleteResponse,
  resolveAddPasskeyStatus,
  resolveRemovePasskeyStatus,
  shouldRequestSudoForAccountDelete,
} from "@/components/settings/settings-security-runtime-model";

describe("settings security runtime model", () => {
  it("normalizes passkey payloads and refresh states", () => {
    expect(
      normalizePasskeysPayload([
        { deviceType: "MacBook Pro", id: "passkey-1", name: "Primary" },
      ])
    ).toEqual([
      { deviceType: "MacBook Pro", id: "passkey-1", name: "Primary" },
    ]);
    expect(normalizePasskeysPayload({})).toEqual([]);

    expect(
      createPasskeysRefreshFailureState("passkeys backend offline")
    ).toEqual({
      passkeys: [],
      passkeysErrorMessage: "passkeys backend offline",
      passkeysLoadFailed: true,
    });
    expect(
      createPasskeysRefreshSuccessState([
        { deviceType: "MacBook Pro", id: "passkey-1", name: "Primary" },
      ])
    ).toEqual({
      passkeys: [
        { deviceType: "MacBook Pro", id: "passkey-1", name: "Primary" },
      ],
      passkeysErrorMessage: null,
      passkeysLoadFailed: false,
    });
  });

  it("resolves passkey action statuses explicitly", () => {
    expect(resolveAddPasskeyStatus(undefined)).toBe("Passkey added.");
    expect(resolveAddPasskeyStatus({ error: "boom" })).toBe(
      "Unable to add passkey."
    );
    expect(resolveRemovePasskeyStatus({ responseOk: true })).toBe(
      "Passkey removed."
    );
    expect(
      resolveRemovePasskeyStatus({
        error: "Passkey already removed.",
        responseOk: false,
      })
    ).toBe("Passkey already removed.");
    expect(resolveRemovePasskeyStatus({ responseOk: false })).toBe(
      "Unable to remove passkey."
    );
  });

  it("resolves account-delete outcomes and sudo gating", () => {
    expect(shouldRequestSudoForAccountDelete(true)).toBe(false);
    expect(shouldRequestSudoForAccountDelete(false)).toBe(true);

    expect(
      resolveAccountDeleteResponse({
        responseOk: false,
        responseStatus: 403,
      })
    ).toEqual({
      kind: "sudo_required",
      status: "Verification required.",
    });

    expect(
      resolveAccountDeleteResponse({
        payloadError: "Deletion blocked.",
        responseOk: false,
        responseStatus: 500,
      })
    ).toEqual({
      kind: "error",
      status: "Deletion blocked.",
    });

    expect(
      resolveAccountDeleteResponse({
        responseOk: true,
        responseStatus: 200,
      })
    ).toEqual({
      href: "/login",
      kind: "success",
    });
  });
});
