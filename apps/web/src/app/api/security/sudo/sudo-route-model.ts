export const SUDO_REQUEST_COOLDOWN_MS = 45_000;
export const SUDO_ROUTE_STATUS_ERROR = "Unable to load sudo status.";
export const SUDO_ROUTE_ACTION_ERROR = "Unable to process sudo action.";

export function resolveSudoStatus(expiresAt: Date | null) {
  const expiresInSeconds = expiresAt
    ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
    : 0;
  const active = expiresInSeconds > 0;

  return {
    active,
    expiresAt: expiresAt?.toISOString() ?? null,
    expiresInSeconds,
  };
}

export function resolveSudoAction(payload: { action?: unknown }) {
  if (payload.action === "request" || payload.action === "verify") {
    return payload.action;
  }
  return null;
}

export function normalizeSudoCode(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function isSudoChallengeRateLimited(createdAt: Date | null) {
  return Boolean(
    createdAt && Date.now() - createdAt.getTime() < SUDO_REQUEST_COOLDOWN_MS
  );
}

export function resolveSudoRouteError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
