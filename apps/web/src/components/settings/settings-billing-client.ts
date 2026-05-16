"use client";

import type { BillingUsage } from "@/components/settings/settings-panel-model";

function getBillingError(
  payload: { error?: string } | null | undefined,
  fallback: string
) {
  return payload?.error ?? fallback;
}

async function parseJson<T>(response: Response) {
  return (await response.json().catch(() => ({}))) as T;
}

export async function loadBillingUsage() {
  const response = await fetch("/api/billing/usage", {
    cache: "no-store",
  });
  const payload = await parseJson<{ error?: string; usage?: BillingUsage }>(
    response
  );

  if (!response.ok) {
    throw new Error(getBillingError(payload, "Unable to load billing usage."));
  }

  return payload.usage ?? null;
}

export async function loadBillingPortalUrl(returnPath: string) {
  const response = await fetch("/api/billing/portal", {
    body: JSON.stringify({ returnPath }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = await parseJson<{ error?: string; url?: string }>(response);

  if (!(response.ok && payload.url)) {
    throw new Error(getBillingError(payload, "Unable to open billing portal."));
  }

  return payload.url;
}
