const EXTENSION_PROTOCOLS = new Set(["chrome-extension:", "moz-extension:"]);
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function parseOriginList(value?: string) {
  return (
    value
      ?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) ?? []
  );
}

function isBrowserExtensionOrigin(
  origin: string | null | undefined
): origin is string {
  if (!origin) {
    return false;
  }

  try {
    return EXTENSION_PROTOCOLS.has(new URL(origin).protocol);
  } catch {
    return false;
  }
}

function isLoopbackOrigin(origin: string | null | undefined): origin is string {
  if (!origin) {
    return false;
  }

  try {
    const url = new URL(origin);

    if (!(url.protocol === "http:" || url.protocol === "https:")) {
      return false;
    }

    return LOOPBACK_HOSTS.has(url.hostname) || url.hostname.startsWith("127.");
  } catch {
    return false;
  }
}

export function resolveTrustedOrigins(input: {
  appUrl: string;
  trustedOriginsFromEnv: string[];
  extensionOriginsFromEnv: string[];
  nodeEnv: string | undefined;
  requestOrigin: string | null;
}) {
  const trustedOrigins = Array.from(
    new Set([
      input.appUrl,
      ...input.trustedOriginsFromEnv,
      ...input.extensionOriginsFromEnv,
    ])
  );

  if (
    input.nodeEnv !== "production" &&
    (isBrowserExtensionOrigin(input.requestOrigin) ||
      isLoopbackOrigin(input.requestOrigin))
  ) {
    return Array.from(new Set([...trustedOrigins, input.requestOrigin]));
  }

  return trustedOrigins;
}
