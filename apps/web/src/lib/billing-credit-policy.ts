export type PolarCreditMode = "disabled" | "shadow" | "cutover";

export interface PolarCreditConfiguration {
  divergenceThresholdRatio: number;
  eventName: string;
  meterId: string;
  mode: PolarCreditMode;
}

function parseThreshold(raw: string | undefined) {
  if (!raw?.trim()) {
    return 0.01;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new Error(
      "POLAR_CREDITS_DIVERGENCE_THRESHOLD_RATIO must be between 0 and 1"
    );
  }
  return parsed;
}

export function getPolarCreditMode(
  environment: NodeJS.ProcessEnv = process.env
): PolarCreditMode {
  const configured = environment.POLAR_CREDITS_MODE?.trim();
  if (configured === "disabled" || configured === "shadow" || configured === "cutover") {
    return configured;
  }
  if (configured) {
    throw new Error("POLAR_CREDITS_MODE must be disabled, shadow, or cutover");
  }
  return environment.POLAR_CREDITS_SHADOW_MODE === "true" ? "shadow" : "disabled";
}

export function requirePolarCreditConfiguration(
  environment: NodeJS.ProcessEnv = process.env
): PolarCreditConfiguration {
  const mode = getPolarCreditMode(environment);
  if (mode === "disabled") {
    throw new Error("Polar credits are disabled");
  }
  const eventName = environment.POLAR_CREDITS_EVENT_NAME?.trim() ?? "";
  const meterId = environment.POLAR_CREDITS_METER_ID?.trim() ?? "";
  if (!(eventName && meterId)) {
    throw new Error(
      "Polar credits require POLAR_CREDITS_EVENT_NAME and POLAR_CREDITS_METER_ID"
    );
  }
  return {
    divergenceThresholdRatio: parseThreshold(
      environment.POLAR_CREDITS_DIVERGENCE_THRESHOLD_RATIO
    ),
    eventName,
    meterId,
    mode,
  };
}

export function canRemoveLegacyCreditLedger(input: {
  consecutiveMatchingDays: number;
  hasConcurrentAdmissionEvidence: boolean;
  hasOutageAndRetryEvidence: boolean;
  hasRefundEvidence: boolean;
  hasRenewalEvidence: boolean;
  unexplainedDivergences: number;
}) {
  return (
    input.consecutiveMatchingDays >= 7 &&
    input.hasConcurrentAdmissionEvidence &&
    input.hasOutageAndRetryEvidence &&
    input.hasRefundEvidence &&
    input.hasRenewalEvidence &&
    input.unexplainedDivergences === 0
  );
}
