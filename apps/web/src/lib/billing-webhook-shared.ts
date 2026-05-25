import type { BillingPlan } from "@avenire/database";

export function toBillingPlan(input: string | null | undefined): BillingPlan {
  if (input === "core" || input === "scholar") {
    return input;
  }
  return "access";
}

export function toPaidPlanOrNull(
  input: string | null | undefined
): Exclude<BillingPlan, "access"> | null {
  if (input === "core" || input === "scholar") {
    return input;
  }
  return null;
}

export function getEventString(
  source: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return null;
}

export function getMetadata(source: Record<string, unknown>) {
  const raw = source.metadata ?? source.customMetadata;
  if (!raw || typeof raw !== "object") {
    return {} as Record<string, unknown>;
  }
  return raw as Record<string, unknown>;
}
