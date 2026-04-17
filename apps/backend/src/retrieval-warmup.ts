function normalizeUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function resolveWebAppBaseUrl() {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.BETTER_AUTH_URL?.trim();
  if (configured) {
    return normalizeUrl(configured);
  }

  return null;
}

export async function triggerRetrievalWarmup(input: {
  chunkCount?: number;
  fileId?: string | null;
  jobId?: string | null;
  resourceCount?: number;
  workspaceId: string;
}) {
  const baseUrl = resolveWebAppBaseUrl();
  const token = process.env.MAINTENANCE_CRON_TOKEN?.trim();
  if (!baseUrl || !token) {
    return {
      ok: false as const,
      reason: !baseUrl ? "app-url-missing" : "token-missing",
    };
  }

  const response = await fetch(`${baseUrl}/api/maintenance/retrieval/warmup`, {
    body: JSON.stringify(input),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Retrieval warmup request failed (${response.status}): ${body || response.statusText}`
    );
  }

  return {
    ok: true as const,
    result: await response.json(),
  };
}
