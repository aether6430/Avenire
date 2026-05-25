import type { PasskeyEntry } from "@/components/settings/settings-panel-model";

export function normalizePasskeysPayload(payload: unknown): PasskeyEntry[] {
  return Array.isArray(payload) ? (payload as PasskeyEntry[]) : [];
}

export function createPasskeysRefreshFailureState(
  errorMessage?: string | null
) {
  return {
    passkeys: [] as PasskeyEntry[],
    passkeysErrorMessage: errorMessage?.trim() || "Unable to load passkeys.",
    passkeysLoadFailed: true,
  };
}

export function createPasskeysRefreshSuccessState(payload: unknown) {
  return {
    passkeys: normalizePasskeysPayload(payload),
    passkeysErrorMessage: null,
    passkeysLoadFailed: false,
  };
}

export function resolveAddPasskeyStatus(
  result: { error?: unknown } | undefined
) {
  return result?.error ? "Unable to add passkey." : "Passkey added.";
}

export function resolveRemovePasskeyStatus(input: {
  error?: string | null;
  responseOk: boolean;
}) {
  return input.responseOk
    ? "Passkey removed."
    : input.error?.trim() || "Unable to remove passkey.";
}

export function shouldRequestSudoForAccountDelete(sudoActive: boolean) {
  return !sudoActive;
}

export function resolveAccountDeleteResponse(input: {
  payloadError?: string | null;
  responseOk: boolean;
  responseStatus: number;
}) {
  if (input.responseStatus === 403) {
    return {
      kind: "sudo_required" as const,
      status: "Verification required.",
    };
  }

  if (!input.responseOk) {
    return {
      kind: "error" as const,
      status: input.payloadError ?? "Unable to delete account.",
    };
  }

  return {
    href: "/login",
    kind: "success" as const,
  };
}
