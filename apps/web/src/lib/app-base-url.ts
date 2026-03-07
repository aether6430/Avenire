function normalizeUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export function resolveAppBaseUrl(request?: Request): string {
  const configured =
    process.env.BETTER_AUTH_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return normalizeUrl(configured);
  }

  if (request) {
    return normalizeUrl(new URL(request.url).origin);
  }

  throw new Error(
    "App base URL is not configured. Set BETTER_AUTH_URL or NEXT_PUBLIC_APP_URL.",
  );
}
