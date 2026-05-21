"use client";

function isLocalHostAlias(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function resolveAuthClientBaseURL() {
  const configuredBaseURL = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!(configuredBaseURL && typeof window !== "undefined")) {
    return configuredBaseURL;
  }

  try {
    const configured = new URL(configuredBaseURL);
    const current = new URL(window.location.origin);
    const isSameLocalApp =
      isLocalHostAlias(configured.hostname) &&
      isLocalHostAlias(current.hostname) &&
      configured.protocol === current.protocol &&
      configured.port === current.port;

    return isSameLocalApp ? current.origin : configuredBaseURL;
  } catch {
    return configuredBaseURL;
  }
}
