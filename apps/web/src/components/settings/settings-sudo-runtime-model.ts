export function shouldLoadInitialSudoStatus(input: {
  currentTab: string;
  securityLoaded: boolean;
}) {
  return input.currentTab === "security" && !input.securityLoaded;
}

export function shouldAutoRequestSudoCode(input: {
  codeRequested: boolean;
  sudoActive: boolean;
  sudoDialogOpen: boolean;
}) {
  return input.sudoDialogOpen && !input.sudoActive && !input.codeRequested;
}

export function resolveSudoStatusPayload(active: boolean | undefined) {
  return active
    ? {
        sudoActive: true,
        sudoStatus: "Sudo mode is active for this session.",
      }
    : {
        sudoActive: false,
        sudoStatus: null,
      };
}

export function createSudoStatusFailureState(error?: string | null) {
  return {
    sudoActive: false,
    sudoStatus: error?.trim() || "Unable to load sudo status.",
  };
}

export function createSudoActionRequestState(actionLabel: string) {
  return {
    sudoActionLabel: actionLabel,
    sudoCode: "",
    sudoDialogOpen: true,
    sudoStatus: null,
  };
}

export function createSudoCodeRequestStartState() {
  return {
    sudoRequestingCode: true,
    sudoStatus: "Sending verification code...",
  };
}

export function resolveSudoCodeRequestStatus(input: {
  error?: string;
  responseOk: boolean;
}) {
  return {
    sudoRequestingCode: false,
    sudoStatus: input.responseOk
      ? "Verification code sent to your email."
      : (input.error ?? "Unable to send code."),
  };
}

export function createSudoVerifyStartState() {
  return {
    sudoStatus: "Verifying code...",
    sudoVerifyingCode: true,
  };
}

export function resolveSudoVerifyFailureState(error?: string) {
  return {
    sudoActive: false,
    sudoStatus: error ?? "Invalid or expired code.",
    sudoVerifyingCode: false,
  };
}

export function createSudoVerifySuccessState() {
  return {
    resetCodeRequested: true,
    sudoActive: true,
    sudoCode: "",
    sudoDialogOpen: false,
    sudoStatus: "Sudo mode is active for 12 hours.",
    sudoVerifyingCode: false,
  };
}
