import { describe, expect, it } from "vitest";
import {
  createSudoActionRequestState,
  createSudoCodeRequestStartState,
  createSudoVerifyStartState,
  createSudoVerifySuccessState,
  resolveSudoCodeRequestStatus,
  resolveSudoStatusPayload,
  resolveSudoVerifyFailureState,
  shouldAutoRequestSudoCode,
  shouldLoadInitialSudoStatus,
} from "@/components/settings/settings-sudo-runtime-model";

describe("settings sudo runtime model", () => {
  it("gates initial sudo refresh and auto-request logic", () => {
    expect(
      shouldLoadInitialSudoStatus({
        currentTab: "security",
        securityLoaded: false,
      })
    ).toBe(true);
    expect(
      shouldLoadInitialSudoStatus({
        currentTab: "account",
        securityLoaded: false,
      })
    ).toBe(false);

    expect(
      shouldAutoRequestSudoCode({
        codeRequested: false,
        sudoActive: false,
        sudoDialogOpen: true,
      })
    ).toBe(true);
    expect(
      shouldAutoRequestSudoCode({
        codeRequested: true,
        sudoActive: false,
        sudoDialogOpen: true,
      })
    ).toBe(false);
  });

  it("creates deterministic states for sudo action requests and code requests", () => {
    expect(createSudoActionRequestState("delete your account")).toEqual({
      sudoActionLabel: "delete your account",
      sudoCode: "",
      sudoDialogOpen: true,
      sudoStatus: null,
    });
    expect(createSudoCodeRequestStartState()).toEqual({
      sudoRequestingCode: true,
      sudoStatus: "Sending verification code...",
    });
    expect(
      resolveSudoCodeRequestStatus({
        responseOk: true,
      })
    ).toEqual({
      sudoRequestingCode: false,
      sudoStatus: "Verification code sent to your email.",
    });
    expect(
      resolveSudoCodeRequestStatus({
        error: "Email disabled.",
        responseOk: false,
      })
    ).toEqual({
      sudoRequestingCode: false,
      sudoStatus: "Email disabled.",
    });
  });

  it("creates deterministic states for sudo refresh and verification outcomes", () => {
    expect(resolveSudoStatusPayload(true)).toEqual({
      sudoActive: true,
      sudoStatus: "Sudo mode is active for this session.",
    });
    expect(resolveSudoStatusPayload(false)).toEqual({
      sudoActive: false,
      sudoStatus: null,
    });
    expect(createSudoVerifyStartState()).toEqual({
      sudoStatus: "Verifying code...",
      sudoVerifyingCode: true,
    });
    expect(resolveSudoVerifyFailureState("Code expired.")).toEqual({
      sudoActive: false,
      sudoStatus: "Code expired.",
      sudoVerifyingCode: false,
    });
    expect(createSudoVerifySuccessState()).toEqual({
      resetCodeRequested: true,
      sudoActive: true,
      sudoCode: "",
      sudoDialogOpen: false,
      sudoStatus: "Sudo mode is active for 12 hours.",
      sudoVerifyingCode: false,
    });
  });
});
